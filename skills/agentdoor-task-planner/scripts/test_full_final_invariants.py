"""Deterministic regressions distilled from full-final planning failures.

These tests exercise the public prepare/check evaluation path.  The frozen case
expectation supplies the semantic classification (direct, transitive,
source-only, or preserved); the evaluator is responsible only for enforcing
the resulting graph or update invariant without inspecting prose.
"""

from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import evaluate
import validate_plan
from test_validate_plan import inputs, output_for, task


CASE_ID = "FULL-FINAL-INVARIANT"


class FullFinalInvariantRegressionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="planner-full-final-invariant-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.root = self.directory / "skill"
        self.run = self.directory / "run"
        for name in (
            "SKILL.md",
            "references/planning-v0.2.md",
            "references/planning-v0.2.schema.json",
            "references/context-and-replanning.md",
            "scripts/evaluate.py",
            "scripts/validate_plan.py",
        ):
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(evaluate.ROOT / name, target)
        for target, attribute, value in (
            (evaluate, "ROOT", self.root),
            (validate_plan, "SCHEMA", self.root / "references/planning-v0.2.schema.json"),
        ):
            patcher = patch.object(target, attribute, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def replan(self, tasks, changes):
        source = inputs()
        source["currentTaskId"] = "root"
        source["context"]["tasks"] = tasks
        planned = output_for(source)
        planned["intent"] = "replan"
        planned["proposal"] = {
            "rootTaskId": "root",
            "complexity": "complex",
            "changes": changes,
            "preservedTaskIds": [
                item["id"]
                for item in tasks
                if item["id"] not in {change["targetId"] for change in changes}
            ],
        }
        planned["nextActions"][0]["taskId"] = "root"
        return source, planned

    def update_dependencies(self, task_id, dependencies):
        return {
            "id": f"update-{task_id}-dependencies",
            "action": "update",
            "targetId": task_id,
            "parentId": "root",
            "fields": {"dependsOnTaskIds": dependencies},
            "reason": "同步该消费者实际需要的生产结果",
            "evidenceRefs": ["req", task_id],
        }

    def check(self, source, planned, expectation):
        evaluate.write(
            self.root / "evals/industry-fixtures.json",
            {
                "teams": [{"teamId": "team", "members": source["members"]}],
                "scenarios": [
                    {
                        "id": CASE_ID,
                        "teamId": "team",
                        "industry": "full_final_regression",
                        "category": "deterministic_invariant",
                        "input": source,
                    }
                ],
            },
        )
        evaluate.write(
            self.root / "evals/industry-expectations.json",
            {
                "expectations": [
                    {
                        "scenarioId": CASE_ID,
                        "allowedIntents": ["replan"],
                        "allowedDispositions": ["ready_for_confirmation"],
                        "manualChecks": [],
                        **expectation,
                    }
                ]
            },
        )
        evaluate.prepare(self.run, cases=[CASE_ID])
        evaluate.write(self.run / "outputs" / f"{CASE_ID}.json", planned)
        return evaluate.check(self.run)["results"][0]

    def test_consumer_cannot_omit_one_of_multiple_required_producers(self):
        source, planned = self.replan(
            [
                task("root"),
                task("design-result", "root", status="completed"),
                task("pcn-applicability", "root", status="completed"),
                task("dvt-consumer", "root"),
            ],
            [self.update_dependencies("dvt-consumer", ["design-result"])],
        )

        result = self.check(
            source,
            planned,
            {
                "requiredDependencies": [
                    {
                        "taskId": "dvt-consumer",
                        "dependsOnTaskIds": ["design-result", "pcn-applicability"],
                    }
                ]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn(
            "Missing required handoff dependencies for dvt-consumer",
            result["errors"],
        )

    def test_source_only_fact_cannot_be_replaced_by_a_processing_task_edge(self):
        source, planned = self.replan(
            [
                task("root"),
                task("ownership-processing", "root"),
                task("msa-consumer", "root"),
            ],
            [self.update_dependencies("msa-consumer", ["ownership-processing"])],
        )
        source["context"]["sourceRefs"].append(
            {
                "id": "approved-registry-v3",
                "text": "已批准登记册中的法定名称与地址可由 MSA 直接读取。",
            }
        )
        planned["reasoningSummary"] = [
            {
                "text": "MSA 直接读取已批准登记册事实。",
                "evidenceRefs": ["approved-registry-v3", "msa-consumer"],
            }
        ]

        result = self.check(
            source,
            planned,
            {
                # The semantic reviewer freezes this row as source_only.  The
                # deterministic evaluator then enforces the empty task edge set.
                "exactDependencies": [
                    {"taskId": "msa-consumer", "dependsOnTaskIds": []}
                ]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn(
            "Final dependency set does not exactly match for msa-consumer",
            result["errors"],
        )

    def test_external_upload_state_cannot_replace_the_task_verified_status(self):
        source, planned = self.replan(
            [
                task("root"),
                task("baseline", "root", status="completed"),
                task("receipt-verification", "root"),
                task("downstream-consumer", "root", deps=["baseline"]),
            ],
            [self.update_dependencies("downstream-consumer", ["baseline"])],
        )
        source["context"]["sourceRefs"].append(
            {
                "id": "external-upload-status",
                "text": "供应方预计明日上传；当前没有内部收件与核对结论。",
            }
        )

        result = self.check(
            source,
            planned,
            {
                "requiredDependencies": [
                    {
                        "taskId": "downstream-consumer",
                        "dependsOnTaskIds": ["baseline", "receipt-verification"],
                    }
                ]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn(
            "Missing required handoff dependencies for downstream-consumer",
            result["errors"],
        )

    def test_transitive_consumer_cannot_gain_a_redundant_direct_edge(self):
        source, planned = self.replan(
            [
                task("root"),
                task("approved-claim", "root", status="completed"),
                task("paid-channel", "root", deps=["approved-claim"]),
                task("launch-check", "root", deps=["paid-channel"]),
            ],
            [
                self.update_dependencies(
                    "launch-check", ["paid-channel", "approved-claim"]
                )
            ],
        )

        result = self.check(
            source,
            planned,
            {
                # launch-check consumes paid-channel; the claim already reaches
                # it through that direct producer and must remain transitive.
                "exactDependencies": [
                    {
                        "taskId": "launch-check",
                        "dependsOnTaskIds": ["paid-channel"],
                    }
                ]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn(
            "Final dependency set does not exactly match for launch-check",
            result["errors"],
        )

    def test_intermediate_result_transmits_its_upstream_rows_without_hiding_independent_use(self):
        source, planned = self.replan(
            [
                task("root"),
                task("scope-decision", "root", status="completed"),
                task(
                    "instance-check",
                    "root",
                    deps=["scope-decision"],
                ),
                task("assembly-guide", "root"),
                task("independent-validation", "root"),
            ],
            [
                # The guide is explicitly a consumer of the composite check,
                # so scope-decision is transitive for it.  Validation consumes
                # both results independently and legitimately keeps both edges.
                self.update_dependencies(
                    "assembly-guide", ["instance-check", "scope-decision"]
                ),
                self.update_dependencies(
                    "independent-validation",
                    ["instance-check", "scope-decision"],
                ),
            ],
        )

        result = self.check(
            source,
            planned,
            {
                "exactDependencies": [
                    {
                        "taskId": "assembly-guide",
                        "dependsOnTaskIds": ["instance-check"],
                    },
                    {
                        "taskId": "independent-validation",
                        "dependsOnTaskIds": [
                            "instance-check",
                            "scope-decision",
                        ],
                    },
                ]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn(
            "Final dependency set does not exactly match for assembly-guide",
            result["errors"],
        )
        self.assertNotIn(
            "Final dependency set does not exactly match for independent-validation",
            result["errors"],
        )

    def test_matrix_reclassification_alone_cannot_delete_an_old_direct_edge(self):
        source, planned = self.replan(
            [
                task("root"),
                task("scope-decision", "root", status="completed"),
                task(
                    "composite-check",
                    "root",
                    deps=["scope-decision"],
                ),
                task(
                    "downstream-review",
                    "root",
                    deps=["scope-decision", "composite-check"],
                ),
            ],
            [
                self.update_dependencies(
                    "downstream-review",
                    ["composite-check"],
                )
            ],
        )

        result = self.check(
            source,
            planned,
            {
                # The new intermediate path is not itself source evidence that
                # the old direct result became obsolete.
                "exactDependencies": [
                    {
                        "taskId": "downstream-review",
                        "dependsOnTaskIds": [
                            "scope-decision",
                            "composite-check",
                        ],
                    }
                ]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn(
            "Final dependency set does not exactly match for downstream-review",
            result["errors"],
        )

    def test_semantic_forward_complete_producer_declared_preserved_cannot_be_rewritten(self):
        producer = task("receipt-classification", "root", status="blocked")
        producer["acceptanceCriteria"] = [
            "收到正式回单后核对到账事实并形成期间归属结论"
        ]
        source, planned = self.replan(
            [task("root"), producer, task("fx-consumer", "root")],
            [
                {
                    "id": "rewrite-receipt-classification",
                    "action": "update",
                    "targetId": "receipt-classification",
                    "parentId": "root",
                    "fields": {
                        "acceptanceCriteria": [
                            "正式回单到达后确认到账并记录所属期间"
                        ]
                    },
                    "reason": "重复表达既有生产边界",
                    "evidenceRefs": ["req", "receipt-classification"],
                }
            ],
        )

        result = self.check(
            source,
            planned,
            {
                # Semantic equivalence is a frozen case judgment.  The
                # evaluator deterministically checks only that this producer
                # stays out of the update set; it does not compare prose.
                "mustNotUpdateTaskIds": ["receipt-classification"]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn("Updated a protected case task", result["errors"])

    def test_new_producer_cannot_delete_an_old_direct_edge_without_obsolescence(self):
        source, planned = self.replan(
            [
                task("root"),
                task("formal-retest", "root", status="completed"),
                task(
                    "third-party-certificate",
                    "root",
                    deps=["formal-retest"],
                ),
                task("cabinet-remediation", "root"),
                task(
                    "owner-reinspection",
                    "root",
                    deps=["formal-retest", "cabinet-remediation"],
                ),
            ],
            [
                self.update_dependencies(
                    "owner-reinspection",
                    ["third-party-certificate", "cabinet-remediation"],
                )
            ],
        )

        result = self.check(
            source,
            planned,
            {
                # The certificate is additive.  No frozen source marks the
                # existing formal-retest edge obsolete, so the final set is a
                # union of the old direct edges and the new producer.
                "exactDependencies": [
                    {
                        "taskId": "owner-reinspection",
                        "dependsOnTaskIds": [
                            "formal-retest",
                            "third-party-certificate",
                            "cabinet-remediation",
                        ],
                    }
                ]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn(
            "Final dependency set does not exactly match for owner-reinspection",
            result["errors"],
        )

    def test_same_round_intermediate_edge_makes_shared_upstream_transitive(self):
        source, planned = self.replan(
            [
                task("root"),
                task("receipt-classification", "root"),
                task("fx-adjustment", "root"),
                task("journal-review", "root"),
            ],
            [
                self.update_dependencies(
                    "fx-adjustment", ["receipt-classification"]
                ),
                self.update_dependencies(
                    "journal-review",
                    ["fx-adjustment", "receipt-classification"],
                ),
            ],
        )

        result = self.check(
            source,
            planned,
            {
                # The merged graph includes both proposed edges.  Once the
                # adjustment consumes the receipt classification, the review
                # reaches that upstream result through the adjustment.
                "exactDependencies": [
                    {
                        "taskId": "fx-adjustment",
                        "dependsOnTaskIds": ["receipt-classification"],
                    },
                    {
                        "taskId": "journal-review",
                        "dependsOnTaskIds": ["fx-adjustment"],
                    },
                ]
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertNotIn(
            "Final dependency set does not exactly match for fx-adjustment",
            result["errors"],
        )
        self.assertIn(
            "Final dependency set does not exactly match for journal-review",
            result["errors"],
        )

    def test_raw_receipt_index_is_source_only_not_a_processing_task_edge(self):
        source, planned = self.replan(
            [
                task("root"),
                task("receipt-classification", "root"),
                task("evidence-index", "root"),
            ],
            [self.update_dependencies("evidence-index", ["receipt-classification"])],
        )
        source["context"]["sourceRefs"].append(
            {
                "id": "formal-receipt",
                "text": "证据索引只需定位这份正式外部回单。",
            }
        )

        result = self.check(
            source,
            planned,
            {
                # Locating the raw authority artifact does not consume the
                # internal task's separate classification conclusion.
                "mustNotUpdateTaskIds": ["evidence-index"],
                "exactDependencies": [
                    {"taskId": "evidence-index", "dependsOnTaskIds": []}
                ],
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn("Updated a protected case task", result["errors"])
        self.assertIn(
            "Final dependency set does not exactly match for evidence-index",
            result["errors"],
        )

    def test_generic_approved_numbers_do_not_expand_the_update_set(self):
        source, planned = self.replan(
            [
                task("root"),
                task("fx-adjustment", "root"),
                task("variance-commentary", "root"),
            ],
            [self.update_dependencies("variance-commentary", ["fx-adjustment"])],
        )
        source["context"]["tasks"][2]["acceptanceCriteria"] = [
            "使用已批准数字形成说明，不使用草稿数字"
        ]

        result = self.check(
            source,
            planned,
            {
                # Generic approval language establishes a quality boundary,
                # not consumption of one specific producer's atomic result.
                "mustNotUpdateTaskIds": ["variance-commentary"],
                "exactDependencies": [
                    {"taskId": "variance-commentary", "dependsOnTaskIds": []}
                ],
            },
        )

        self.assertEqual(result["status"], "failed")
        self.assertIn("Updated a protected case task", result["errors"])
        self.assertIn(
            "Final dependency set does not exactly match for variance-commentary",
            result["errors"],
        )


if __name__ == "__main__":
    unittest.main()

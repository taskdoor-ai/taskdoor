import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFileAnnotationContext, createTaskFileAnnotation, validateTaskFileAnnotations } from "../src/features/tasks/files/lib/task-file-annotations.ts";
import { createFileAnnotationDocument, createFileAnnotationDiscussionDraft } from "../src/features/tasks/files/lib/task-file-annotation-document.ts";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";

const file: TaskFileNode = { id: "source", name: "方案.md", kind: "file", parentId: null, updatedAt: "2026-10-15T01:00:00Z", version: 2, content: "产品体验与负责人", mimeType: "text/markdown" };
const annotation = () => createTaskFileAnnotation({ taskId: "task", file, id: "note", authorId: "author", authorName: "周岚", createdAt: "2026-10-15T02:00:00Z", body: "补充负责人\n<script>原话</script>", anchor: { kind: "text", location: "第1段", quote: "产品体验", selectionStart: 0, selectionEnd: 4 } });

test("temporary annotation validation keeps source/version/author without persistent storage", () => {
  const note = annotation();
  const next = validateTaskFileAnnotations("task", [], [note], { actorId: "author", files: [file] });
  assert.deepEqual(next, [note]);
  assert.throws(() => validateTaskFileAnnotations("task", [], [note], { actorId: "other", files: [file] }), /本人/);
  assert.throws(() => validateTaskFileAnnotations("task", [], [note], { actorId: "author", files: [{ ...file, version: 3 }] }), /变化/);
});

test("generated annotation file is a self-contained immutable readable snapshot", () => {
  const note = annotation();
  const context = buildFileAnnotationContext({ taskId: "task", taskTitle: "发布会", annotations: [note], selectedIds: [note.id], files: [file] });
  const result = createFileAnnotationDocument(context, { taskTitle: "发布会", authorName: "周岚", now: "2026-10-14T18:00:00Z", timeZone: "Asia/Shanghai" });
  assert.equal(result.mimeType, "text/html");
  assert.match(result.name, /标注.*\.html$/);
  assert.match(result.content!, /周岚/);
  assert.match(result.content!, /方案\.md · v2/);
  assert.match(result.content!, /<h3>1\. 内容修订<\/h3>/);
  assert.doesNotMatch(result.content!, /产品体验与负责人|来源与固定版本内容|<details>/);
  assert.equal((result.content!.split("<body>")[1].match(/方案\.md · v2/g) ?? []).length, 1);
  assert.match(result.content!, /&lt;script&gt;原话&lt;\/script&gt;/);
  assert.doesNotMatch(result.content!, /<script>/);
  assert.match(result.name, /2026-10-15\.html$/);
  context.items[0].body = "后续修改";
  assert.doesNotMatch(result.content!, /后续修改/);
});


test("发送到讨论区只带标注文件附件，讨论文案保持为空且不修改来源", () => {
  const note = annotation();
  const sourceFiles = [file];
  const context = buildFileAnnotationContext({ taskId: "task", taskTitle: "发布会", annotations: [note], selectedIds: [note.id], files: sourceFiles });
  const before = JSON.stringify({ context, sourceFiles });
  const draft = createFileAnnotationDiscussionDraft(context, { taskTitle: "发布会", authorName: "周岚", locale: "zh-CN", now: "2026-10-15T02:00:00Z" });
  assert.equal(draft.body, "", "标注意见留在文件，讨论文案由用户另写");
  assert.deepEqual(draft.mentions, [], "标注文字中的@不自动创建消息提及");
  assert.equal(draft.attachments.length, 1);
  assert.equal(draft.attachments[0].attachmentOnly, true, "材料只属于讨论，不进任务文件树");
  assert.match(draft.attachments[0].content!, /方案\.md · v2/);
  assert.match(draft.attachments[0].content!, /产品体验/);
  assert.doesNotMatch(draft.attachments[0].content!, /来源与固定版本内容|产品体验与负责人/);
  assert.match(draft.attachments[0].content!, /补充负责人/);
  assert.equal(JSON.stringify({ context, sourceFiles }), before);
  context.items[0].body = "后续改动";
  assert.doesNotMatch(draft.attachments[0].content!, /后续改动/);
});

test("英文附件使用固定标签但保留原始意见；空标注不可形成附件", () => {
  const note = annotation();
  const context = buildFileAnnotationContext({ taskId: "task", taskTitle: "发布会", annotations: [note], selectedIds: [note.id], files: [file] });
  const draft = createFileAnnotationDiscussionDraft(context, { taskTitle: "发布会", authorName: "周岚", locale: "en" });
  assert.equal(draft.body, "");
  assert.match(draft.attachments[0].name, /^Annotations-/);
  assert.match(draft.attachments[0].content!, /补充负责人/);
  assert.throws(() => createFileAnnotationDiscussionDraft({ markdown: "", items: [] }, { taskTitle: "发布会", authorName: "周岚" }), /先添加标注/);
});

test("a shared file/version header appears once; missing generated titles never copy selected content",()=>{
 const first=annotation();const second=createTaskFileAnnotation({taskId:'task',file,authorId:'author',authorName:'周岚',body:'明确对应负责人',anchor:{kind:'text',location:'第1段',quote:'负责人',selectionStart:5,selectionEnd:8}});
 const context=buildFileAnnotationContext({taskId:'task',taskTitle:'发布会',annotations:[first,second],selectedIds:[first.id,second.id],files:[file]});
 const doc=createFileAnnotationDocument(context,{taskTitle:'发布会',authorName:'周岚'});const body=doc.content!.split('<body>')[1];
 assert.equal((body.match(/方案\.md · v2/g)??[]).length,1);assert.match(body,/<h3>1\. 内容修订<\/h3>/);assert.match(body,/<h3>2\. 内容修订<\/h3>/);
 assert.match(body,/选中内容/);assert.match(body,/标注内容/);assert.doesNotMatch(body,/来源与固定版本内容|<details>|产品体验与负责人/);
});


test("有截图时原文默认收起，没有截图时直接展示，完整选文始终保留", () => {
  const quote = "各阶段都有独立退出条件。任何范围变化需形成新版本；前一阶段的问题不通过放量掩盖。\n保留完整原文 <script>不是指令</script>";
  const source = { ...file, content: quote };
  const note = createTaskFileAnnotation({ taskId: "task", file: source, authorId: "author", authorName: "周岚", body: "去掉", anchor: { kind: "text", location: "第2段", quote, selectionStart: 0, selectionEnd: quote.length } });
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=";
  for (const locale of ["zh-CN", "en"]) {
    for (const screenshot of [png, undefined]) {
      const item = { ...note, anchor: { ...note.anchor, screenshot } };
      const html = createFileAnnotationDocument({ markdown: "", items: [item] }, { taskTitle: "发布会", authorName: "周岚", locale }).content!;
      assert.match(html, /<h3>1\. (?:内容修订|Content revision)<\/h3>/);
      assert.match(html, /前一阶段的问题不通过放量掩盖。\n保留完整原文 &lt;script&gt;不是指令&lt;\/script&gt;/);
      assert.match(html, /位置|Location/);
      assert.match(html, /去掉/);
      assert.doesNotMatch(html, /<script>|来源与固定版本内容/);
      if (screenshot) {
        assert.match(html, /<details class="selected"><summary>(查看原文|View original text)<\/summary><blockquote>/);
        assert.doesNotMatch(html, /<details[^>]*\sopen(?:[\s=>])/);
      } else {
        assert.doesNotMatch(html, /<details/);
        assert.match(html, /选中内容|Selected content/);
      }
    }
  }
});


test("标题使用独立生成的修改摘要，原文及原始意见保持", () => {
  const note = annotation();
  const context = { markdown: "", items: [note] };
  const doc = createFileAnnotationDocument(context, { taskTitle: "发布会", authorName: "周岚", titles: { [note.id]: "补齐负责人安排" } });
  assert.match(doc.content!, /<h3>1\. 补齐负责人安排<\/h3>/);
  assert.doesNotMatch(doc.content!, /<h3>[^<]*产品体验/);
  assert.match(doc.content!, /<blockquote>产品体验<\/blockquote>/);
  assert.match(doc.content!, /补充负责人\n&lt;script&gt;原话&lt;\/script&gt;/);
});

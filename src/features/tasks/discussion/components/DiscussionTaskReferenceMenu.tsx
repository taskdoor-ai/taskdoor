import { Popover } from "@base-ui/react/popover";
import { MenuOption } from "@lexical/react/LexicalMenuOption";
import { LexicalTypeaheadMenuPlugin, type MenuRenderFn } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createTextNode, type LexicalEditor } from "lexical";
import { useMemo, useState, type RefObject } from "react";
import { $createDiscussionTaskReferenceNode } from "@/features/tasks/discussion/components/DiscussionTaskReferenceNode";
import { readDiscussionTaskQuery, searchDiscussionReferenceTasks, type DiscussionReferenceTask } from "@/features/tasks/discussion/lib/discussion-task-reference";

class TaskOption extends MenuOption {
  readonly label: string;

  constructor(readonly task: DiscussionReferenceTask) {
    super(task.id);
    this.label = task.title;
  }
}

function matchTaskQuery(text: string, editor: LexicalEditor) {
  return editor.isComposing() ? null : readDiscussionTaskQuery(text);
}

export function DiscussionTaskReferenceMenu({ anchor, tasks }: { anchor: RefObject<HTMLDivElement | null>; tasks: DiscussionReferenceTask[] }) {
  const [query, setQuery] = useState<string | null>(null);
  const options = useMemo(() => query === null ? [] : searchDiscussionReferenceTasks(tasks, query).map(task => new TaskOption(task)), [tasks, query]);
  const renderMenu: MenuRenderFn<TaskOption> = (menuAnchor, { options, selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
    if (!menuAnchor.current) return null;
    return <Popover.Root open>
      <Popover.Portal container={menuAnchor.current}>
        <Popover.Positioner align="start" anchor={anchor} collisionAvoidance={{ side: "none", align: "shift" }} positionMethod="fixed" side="top" sideOffset={8}>
          <ul className="discussion-task-reference-options">
            {options.map((option, index) => <li
              aria-selected={selectedIndex === index}
              id={`typeahead-item-${index}`}
              key={option.key}
              onClick={() => selectOptionAndCleanUp(option)}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(index)}
              ref={option.setRefElement}
              role="option"
            >
              <span title={option.label}>{option.label}</span>
            </li>)}
          </ul>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>;
  };

  return <LexicalTypeaheadMenuPlugin
    anchorClassName="discussion-task-reference-menu"
    menuRenderFn={options.length ? renderMenu : undefined}
    onQueryChange={setQuery}
    onSelectOption={(option, queryNode, closeMenu) => {
      if (queryNode) {
        const spacer = $createTextNode(" ");
        queryNode.replace($createDiscussionTaskReferenceNode(option.task)).insertAfter(spacer);
        spacer.selectEnd();
      }
      closeMenu();
    }}
    options={options}
    triggerFn={matchTaskQuery}
  />;
}

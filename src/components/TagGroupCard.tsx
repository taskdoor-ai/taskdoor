import { Ellipsis, Plus, Tag } from "lucide-react";
import type { TagDefinition, TagGroup } from "../data/tagGroups";
import { TagBadge } from "./TagBadge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

type Props = { group: TagGroup; onAddTag: () => void; onDelete: () => void; onEditGroup: () => void; onEditTag: (tag: TagDefinition) => void };

export function TagGroupCard({ group, onAddTag, onDelete, onEditGroup, onEditTag }: Props) {
  return <article className="tag-group-card">
    <header className="tag-group-card-header"><span className="tag-group-card-icon"><Tag aria-hidden="true" /></span><div className="tag-group-card-heading"><h2>{group.name}</h2><p>{group.tags.length} 个标签</p></div><DropdownMenu><DropdownMenuTrigger render={<Button aria-label={`管理标签组 ${group.name}`} size="icon" type="button" variant="ghost" />}><Ellipsis /></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-40"><DropdownMenuItem onClick={onEditGroup}>编辑标签组</DropdownMenuItem><DropdownMenuItem onClick={onDelete} variant="destructive">删除标签组</DropdownMenuItem></DropdownMenuContent></DropdownMenu></header>
    <div className="tag-group-card-content">{group.tags.length > 0 ? <div className="tag-group-tag-cloud">{group.tags.map((tag) => <button className="tag-edit-trigger" aria-label={`编辑标签 ${tag.name}`} key={tag.id} onClick={() => onEditTag(tag)} type="button"><TagBadge tag={tag} /></button>)}</div> : <div className="tag-group-card-empty"><p>这个标签组还是空的</p><span>添加标签后，可在任务中直接使用。</span></div>}</div>
    <footer className="tag-group-card-footer"><Button onClick={onAddTag} size="sm" type="button" variant="ghost"><Plus data-icon="inline-start" />添加标签</Button></footer>
  </article>;
}

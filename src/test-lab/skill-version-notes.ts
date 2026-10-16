import type {LabSkillVersion} from '@/test-lab/types';

export function skillVersionOption(version:Pick<LabSkillVersion,'label'|'notes'>){
  const notes=version.notes.trim().replace(/\s+/g,' ');
  return notes?`${version.label} · ${notes.length>52?notes.slice(0,52)+'…':notes}`:version.label;
}

export function selectedSkillVersion(versions:LabSkillVersion[],defaults:Partial<Record<string,string>>,skillId:string,versionId?:string|null){
  return versionId===null?undefined:versions.find(version=>version.skillId===skillId&&version.id===(versionId||defaults[skillId]));
}

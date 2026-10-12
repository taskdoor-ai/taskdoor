/** Object property order is not a data change; array order remains meaningful. */
export function stableJson(value:unknown):string{
 const sort=(item:unknown):unknown=>Array.isArray(item)?item.map(sort):item!==null&&typeof item==='object'?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b,'en')).map(([key,value])=>[key,sort(value)])):item;
 return JSON.stringify(sort(value));
}

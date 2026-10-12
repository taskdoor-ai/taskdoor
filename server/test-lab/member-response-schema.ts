/** Syntax constraint from the public contract, never reference answers or inferred scores. */
export function memberResponseSchema(input?:{candidateMemberIds?:string[]}){
 const strings={type:'array',items:{type:'string'}};
 const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:true});
 const assessment=object({requirement:{type:'string'},coverage:{enum:['full','partial','none','unknown']},reason:{type:'string'},evidenceRefs:strings});
 const candidate=object({memberId:{type:'string'},responsibilityVersion:{type:'integer',minimum:1},matchLevel:{enum:['high','partial','low','unknown']},matchPercent:{enum:[0,25,50,75,100,null]},suggestedRole:{enum:['owner','participant',null]},matchedRequirements:strings,requirementAssessments:{type:'array',items:assessment},gaps:strings,pendingChecks:strings,reason:{type:'string'},evidenceRefs:strings});
 const count=input?.candidateMemberIds?.length;
 return object({schemaVersion:{const:'agentdoor.member-match.v0.1'},skillId:{const:'agentdoor-member-matcher'},ruleVersion:{type:'string'},requestId:{type:'string'},principalId:{type:'string'},teamId:{type:'string'},inputVersions:{type:'object'},coverage:{type:'object'},evaluatedAt:{type:'string'},status:{enum:['ready','partial','needs_context','stale']},result:object({taskId:{type:'string'},taskVersion:{type:'integer'},candidates:{type:'array',items:candidate,...(count===undefined?{}:{minItems:count,maxItems:count})},recommendedOwnerId:{type:['string','null']},assignmentUnchanged:{const:true}}),evidenceRefs:strings,unknowns:strings,warnings:strings,writeReceipt:{type:'null'}});
}

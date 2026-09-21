import ast, pathlib, tempfile, subprocess, json, hashlib, datetime
base=pathlib.Path('/private/tmp/observal-selection-review')
source=base/'observal_cli/cmd_skill.py'
names={'_normalize_skill_path','_sparse_clone_skill_dir','_is_path_safe','install_skill_registry_direct','install_skill_from_git'}
module=ast.parse(source.read_text()); funcs=[n for n in module.body if isinstance(n,ast.FunctionDef) and n.name in names]
ut=ast.parse((base/'observal_cli/shared/utils.py').read_text()); sanitize=next(n for n in ut.body if isinstance(n,ast.FunctionDef) and n.name=='sanitize_name')
ns={'Path':pathlib.Path,'subprocess':subprocess,'tempfile':tempfile,'rprint':lambda *a,**k:None,'esc':str,'re':__import__('re')}
exec(compile(ast.Module(body=[sanitize],type_ignores=[]),'<upstream-sanitize>','exec'),ns);ns['_sanitize_name']=ns['sanitize_name']
exec(compile(ast.Module(body=funcs,type_ignores=[]),str(source),'exec'),ns)
with tempfile.TemporaryDirectory(prefix='observal-skill-check-') as td:
 root=pathlib.Path(td);repo=root/'source';repo.mkdir();skill=repo/'skills/brand';skill.mkdir(parents=True)
 files={'SKILL.md':b'---\nname: brand\ndescription: fixture\n---\nBrand fixture','refs/guide.md':b'Guide','assets/logo.png':b'\x89PNG\r\n\x1a\nfixture','assets/font.woff2':b'wOF2\x00\x00fixture','assets/logo.svg':b'<svg xmlns="http://www.w3.org/2000/svg"/>','assets/style.css':b'body{color:navy}','scripts/check.py':b'print("fixture")'}
 for name,data in files.items():p=skill/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 def git(*args):return subprocess.run(['git',*args],cwd=repo,check=True,capture_output=True,text=True).stdout.strip()
 git('init','--initial-branch=main');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','v1');v1=git('rev-parse','HEAD')
 target=root/'installed';kwargs={'name':'brand','git_url':str(repo),'skill_path':'skills/brand','dest':target}
 assert ns['install_skill_from_git'](**kwargs,git_ref=v1)==target
 matches={n:(target/n).read_bytes()==data for n,data in files.items()};assert all(matches.values())
 (skill/'new-only.txt').write_text('v2 extra');(skill/'SKILL.md').write_text('v2');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','v2');v2=git('rev-parse','HEAD')
 assert ns['install_skill_from_git'](**kwargs,git_ref=v2)==target
 assert ns['install_skill_from_git'](**kwargs,git_ref=v1)==target
 direct=root/'direct';fn=ns['install_skill_registry_direct'];fn(name='brand',skill_md_content='v2',script_content='print(2)',script_filename='extra.py',dest=direct);fn(name='brand',skill_md_content='v1',dest=direct)
 result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'upstream_commit':'28fd855236405cc9ca83e7b357b1362b323c801a','method':'Executed unmodified upstream installer functions extracted by AST; isolated temporary local Git repository; no running Observal service or corporate SSO. Only terminal output suppressed.','full_git_package_files_match':matches,'git_old_version_content_restored':(target/'SKILL.md').read_bytes()==files['SKILL.md'],'git_rollback_leaves_new_file':(target/'new-only.txt').exists(),'direct_rollback_leaves_new_script':(direct/'scripts/extra.py').exists(),'direct_installer_accepts_only_skill_text_and_optional_single_script':True}
 pathlib.Path('/private/tmp/observal-installer-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(result,ensure_ascii=False,indent=2))

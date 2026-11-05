"""Local preview integration only; uses isolated local_seedy mock user, no hosted data.
Run after browser checks. Seeds local SQLite runtime to test the 2,000-key boundary.
"""
import json,urllib.request,urllib.error,pathlib,sqlite3,uuid,time
URL='http://127.0.0.1:5173'
GEN=None
out=[]
def call(body=None,auth=True,origin=URL):
 headers={'Origin':origin,'Content-Type':'application/json'}
 if auth: headers['Cookie']='__sites_local_auth=1'
 if body is not None: body={'generation_id':GEN,**body}
 req=urllib.request.Request(URL+'/api/state',data=json.dumps(body).encode() if body is not None else None,headers=headers)
 try:
  with urllib.request.urlopen(req) as r: return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  raw=e.read().decode();return e.code,json.loads(raw) if raw.startswith('{') else {'error':raw}
def post(body,expect=200):
 status,x=call(body);assert status==expect,(status,x,body.get('type'));return x
def mutation(cmd):
 op=post({'type':'issue','action':cmd['action'],'target':cmd.get('id','')})['operation_id']
 return post({'type':'mutate','operation_id':op,'command':cmd})
def passed(label):out.append(label);print('PASS',label)
status,x=call(auth=False);assert status==401;passed('unauthenticated GET rejected')
_,s=call();GEN=s['generation_id']
assert call({'type':'backup'},auth=False)[0]==401
assert call({'type':'backup'},origin='https://other.example')[0]==403;passed('unauthenticated POST and cross-origin rejected')
# preserve a copy in memory before disposable local testing
original=post({'type':'backup'})['content']
post({'type':'delete-all','data_revision':s['data_revision']});_,s=call();GEN=s['generation_id']
mutation({'action':'start','catalog_id':'C01'});_,s=call();e=s['data']['executions'][0]
old=post({'type':'issue','action':'finish','target':e['id']})['operation_id']
mutation({'action':'edit-execution','id':e['id'],'revision':e['revision'],'patch':{'memo':'another tab'}})
# Fill normal slots without 2,000 network round trips. No product fixture endpoint.
paths=[p for p in pathlib.Path('.wrangler/state').rglob('*.sqlite') if p.name!='metadata.sqlite']
con=sqlite3.connect(paths[0]);rows=con.execute('select id,payload from runtime_chunks where owner=? order by id',('local_seedy',)).fetchall();runtime=json.loads(''.join(r[1] for r in rows))
normal=sum(not o['special'] for o in runtime['ops'].values())
for i in range(2000-normal):
 k=str(uuid.uuid4());runtime['ops'][k]={'id':k,'action':'manual','target':'','status':'pending','hash':None,'expires':int(time.time()*1000)+86400000,'special':False}
text=json.dumps(runtime,ensure_ascii=False,separators=(',',':'));con.execute('delete from runtime_chunks where owner=?',('local_seedy',))
for i in range(0,len(text),150000):con.execute('insert into runtime_chunks values (?,?,?)',('local_seedy',str(i).zfill(12),text[i:i+150000]))
con.execute('update accounts set version=version+1 where owner=?',('local_seedy',));con.commit();con.close()
post({'type':'issue','action':'manual'},429)
cmd={'action':'finish','id':e['id'],'revision':e['revision'],'status':'stopped','mark_tried':True}
post({'type':'mutate','operation_id':old,'command':cmd},409)
_,s=call();latest=s['data']['executions'][0];assert latest['status']=='running';assert s['finish_conflicts'][0]['id']==old
new=post({'type':'issue','action':'finish','target':e['id'],'replace':old,'revision':latest['revision']})['operation_id'];assert new!=old
assert post({'type':'issue','action':'finish','target':e['id'],'replace':old,'revision':latest['revision']})['operation_id']==new
cmd['revision']=latest['revision'];response=post({'type':'mutate','operation_id':new,'command':cmd});post({'type':'mutate','operation_id':new,'command':cmd})
_,s=call();assert len(s['data']['executions'])==1 and s['data']['executions'][0]['status']=='stopped';assert s['data']['activity_states'][0]['tried'] is True
passed('T24 2,000 normal keys + revision conflict + pre-expiry replacement + replay, T21 atomic stopped/tried')
# Old request cannot run again, unknown-result retry remains same key.
post({'type':'mutate','operation_id':old,'command':{**cmd,'revision':e['revision']}},409)
post({'type':'mutate','operation_id':new,'command':{**cmd,'status':'completed'}},409)
passed('old rejected key terminal, payload mismatch rejected')
oldgen=GEN;oldrev=s['data_revision'];post({'type':'delete-all','data_revision':oldrev});_,s=call();GEN=s['generation_id'];assert GEN!=oldgen
for b in [{'type':'issue','action':'manual'},{'type':'mutate','operation_id':new,'command':cmd},{'type':'import-preview','raw':original}]:post({**b,'generation_id':oldgen},410)
passed('T23 old create / replay / import requests invalidated after deletion')
fixture=pathlib.Path('fixtures/deleted-references.json').read_text();p=post({'type':'import-preview','raw':fixture});mutation({'action':'import-commit','plan_id':p['plan_id']});_,s=call();assert s['data']['tasks'][0]['deleted_at'];assert len(s['data']['execution_goals'])==1
backup=json.loads(post({'type':'backup'})['content']);f=json.loads(fixture)
for k in ['tasks','goals','executions','task_goals','execution_goals','activity_states','dataset_id']:assert backup[k]==f[k],k
passed('T15/T17 deleted-reference backup restores exact records/settings/links')
# Large backup close to byte cap, including escaped characters in a JSON envelope.
post({'type':'delete-all','data_revision':s['data_revision']});_,s=call();GEN=s['generation_id']
large=s['data'];prototype=json.loads(fixture)['executions'][0]
prototype.update(task_id=None,catalog_id=None,memo='"'*1400,share_mode='none')
large['executions']=[]
for i in range(1800):
 row={**prototype,'id':str(uuid.uuid4()),'snapshot':{**prototype['snapshot']}};large['executions'].append(row)
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
# Keep just below 5MiB. Escaped quotes stress request-envelope expansion.
while len(compact(large).encode())>5242880:large['executions'].pop()
large_raw=compact(large);assert len(large_raw.encode())>5000000
p=post({'type':'import-preview','raw':large_raw});mutation({'action':'import-commit','plan_id':p['plan_id']})
export=post({'type':'backup'})['content'];assert len(json.loads(export)['executions'])==len(large['executions'])
_,s=call();post({'type':'delete-all','data_revision':s['data_revision']});_,s=call();GEN=s['generation_id']
p=post({'type':'import-preview','raw':export});mutation({'action':'import-commit','plan_id':p['plan_id']});_,s=call();assert len(s['data']['executions'])==len(large['executions'])
passed('5MiB-near backup exports and restores through D1 transaction (escaped payload)')
# Restore preview data from before test.
post({'type':'delete-all','data_revision':s['data_revision']});_,s=call();GEN=s['generation_id'];p=post({'type':'import-preview','raw':original});mutation({'action':'import-commit','plan_id':p['plan_id']});passed('original local preview dataset restored')
pathlib.Path('docs/api-test-results.json').write_text(json.dumps({'environment':'local Vinext + D1 / mock identity','passed':out},ensure_ascii=False,indent=2)+'\n')

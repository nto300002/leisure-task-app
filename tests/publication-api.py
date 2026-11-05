"""Local-only public projection integration test; no hosted data is touched."""
import json,urllib.request,urllib.error
URL='http://127.0.0.1:5173';generation=None

def req(path='/api/state',body=None,auth=True):
 headers={'Origin':URL,'Content-Type':'application/json'}
 if auth:headers['Cookie']='__sites_local_auth=1'
 if body is not None:body={'generation_id':generation,**body}
 r=urllib.request.Request(URL+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 try:
  with urllib.request.urlopen(r) as response:return response.status,json.load(response)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
def post(b):
 code,r=req(body=b);assert code==200,(code,r);return r
def mutate(c):
 key=post({'type':'issue','action':c['action'],'target':c.get('id','')})['operation_id'];return post({'type':'mutate','operation_id':key,'command':c})
def posts():
 code,r=req('/api/journal',auth=False);assert code==200;return r['posts']
code,state=req();assert code==200,(code,state);generation=state['generation_id']
assert req(auth=False)[0]==401
assert req(body={'type':'issue','action':'manual'},auth=False)[0]==401
mutate({'action':'manual','title':'公開表示テスト：散歩の出来事','memo':'黄色い花を見つけました。','date':'2026-11-05'})
_,state=req();record=next(e for e in state['data']['executions'] if e['record_title']=='公開表示テスト：散歩の出来事');id=record['id']
assert not any(p['id']==id for p in posts())
mutate({'action':'edit-execution','id':id,'revision':record['revision'],'patch':{'share_mode':'full'},'publish':True})
p=next(p for p in posts() if p['id']==id);assert p['title']==record['record_title'] and p['kind']=='event';assert set(p)=={'id','title','body','date','kind'}
_,state=req();record=next(e for e in state['data']['executions'] if e['id']==id)
mutate({'action':'edit-execution','id':id,'revision':record['revision'],'patch':{'share_mode':'none'}})
assert not any(p['id']==id for p in posts())
_,state=req();record=next(e for e in state['data']['executions'] if e['id']==id)
mutate({'action':'edit-execution','id':id,'revision':record['revision'],'patch':{'share_mode':'summary','share_summary':'共有する一文だけ'},'publish':True})
p=next(p for p in posts() if p['id']==id);assert p['body']=='共有する一文だけ' and p['date'] is None and p['title']!=record['record_title']
_,state=req();record=next(e for e in state['data']['executions'] if e['id']==id)
mutate({'action':'delete-execution','id':id,'revision':record['revision']})
assert not any(p['id']==id for p in posts())
print('PASS: anonymous read, no implicit publication, explicit full/summary publishing, private downgrade, deletion, private API rejection')

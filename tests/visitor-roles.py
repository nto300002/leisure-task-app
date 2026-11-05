"""Exercise only the local production Worker. Identity headers simulate Sites assertions.
Never point this test at hosting; the real Sites edge must supply/strip those headers.
"""
import urllib.request,urllib.error,json,time
URL='http://127.0.0.1:8787'
def raw_request(path,role='anonymous',body=None):
 headers={'Origin':URL,'Content-Type':'application/json'}
 if role!='anonymous':headers.update({'oai-authenticated-user-id':'local_seedy' if role=='admin' else 'local_visitor','oai-authenticated-user-email':'seedy@sites.test' if role=='admin' else 'visitor@example.test'})
 req=urllib.request.Request(URL+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 try:
  with urllib.request.urlopen(req) as r:return r.status,r.read().decode()
 except urllib.error.HTTPError as e:return e.code,e.read().decode()
def request(path,role='anonymous',body=None):
 for attempt in range(5):
  result=raw_request(path,role,body)
  if result!=(503,'Your worker restarted mid-request. Please try sending the request again. Only GET or HEAD requests are retried automatically.'):return result
  time.sleep(.2)
 return result
assert request('/api/state','admin')[0]==200
assert request('/api/state','visitor')[0]==403
assert request('/api/state')[0]==401
for kind in ['issue','mutate','backup','import-preview','share-preview','share-export','delete-all','session-read','session-close']:
 r=request('/api/state','visitor',{'type':kind});assert r[0]==403,(kind,r)
 r=request('/api/state','anonymous',{'type':kind});assert r[0]==401,(kind,r)
for role in ['anonymous','visitor']:
 code,html=request('/',role);assert code==200 and '余暇の記録' in html and 'いつもの候補から' not in html
 assert request('/api/journal',role)[0]==200
code,html=request('/admin','visitor');assert code==200 and 'このアカウントでは管理画面を利用できません' in html
print('PASS local production: admin allowed; visitor/anonymous rejected by every private API branch; public root/feed accessible; /admin denied to visitor')

import re,json,html
L=[html.unescape(l).replace('\u00a0',' ').strip() for l in open('pool.txt',encoding='utf-8')]
subs={};groups={}
for l in L[:190]:
  m=re.match(r'SUBELEMENT (E\d) - ?(.*?) -? ?\[(\d+) [Ee]xam [Qq]uestions? - (\d+) [Gg]roups?\]',l)
  if m: subs[m[1]]={'id':m[1],'title':m[2].strip(' -'),'examQuestions':int(m[3])}
  m=re.match(r'(E\d[A-Z]) (.*)',l)
  if m and not re.match(r'E\d[A-Z]\d\d',l): groups[m[1]]={'id':m[1],'title':m[2],'subelement':m[1][:2]}
qs=[];deleted=[];i=0
while i<len(L):
  m=re.match(r'^(E\d[A-Z]\d\d)\s*\(([A-D])\)\s*(?:\[(.*?)\])?',L[i])
  if m:
    blk=[];j=i+1
    while j<len(L) and L[j]!='~~': 
      if L[j]: blk.append(L[j])
      j+=1
    txt=' '.join(blk)
    if re.search(r'question (has been )?(withdrawn|deleted|removed)',txt,re.I) or len(blk)<5:
      deleted.append(m[1]); i=j; continue
    q=blk[0]; ans=[]
    for b in blk[1:]:
      mm=re.match(r'^([A-D])\.\s*(.*)',b)
      if mm: ans.append(mm[2])
      elif ans: ans[-1]+=' '+b
      else: q+=' '+b
    assert len(ans)==4,(m[1],blk)
    figs=sorted(set(re.findall(r'[Ff]igure (E\d-\d)',q)))
    qs.append({'id':m[1],'subelement':m[1][:2],'group':m[1][:3],'question':q,'answers':ans,'correct':'ABCD'.index(m[2]),'refs':m[3] or None,'figures':figs})
    i=j
  i+=1
out={'schemaVersion':1,'poolId':'extra-2024-2028','element':4,'name':'Amateur Extra Class (Element 4)','validFrom':'2024-07-01','validUntil':'2028-06-30',
 'passScore':37,'examSize':50,
 'source':{'publisher':'NCVEC Question Pool Committee','url':'https://www.ncvec.org/index.php/2024-2028-extra-class-question-pool-release','document':'2024-2028 Extra Class Question Pool and Syllabus Public Release with 4th Errata Feb 4 2026','figures':'https://www.ncvec.org/downloads/e4_2024-svgs.zip','license':'Question pools are public domain'},
 'errata':['2024-01-31: Figure E9-3 (Smith chart) rotated 90 degrees','2024-11-08: E2A13 withdrawn','2025-09-25: E6D07 withdrawn','2026-02-04: E4D05 withdrawn'],
 'withdrawn':['E2A13','E4D05','E6D07'],'subelements':list(subs.values()),'groups':list(groups.values()),'questions':qs}
json.dump(out,open('../app/data/pool-extra-2024-2028.json','w'),indent=1,ensure_ascii=False)
print(len(qs),deleted,len(subs),len(groups),sum(s['examQuestions'] for s in subs.values()))
from collections import Counter;print(Counter(f for q in qs for f in q['figures']))

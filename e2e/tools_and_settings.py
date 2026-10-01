import os
SHOTS=os.environ.get('SHOTS_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)),'shots'))
os.makedirs(SHOTS,exist_ok=True)
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
import re, sys, time
from playwright.sync_api import sync_playwright
WEB="http://localhost:3000"
results=[]
def check(n,c,extra=""):
    results.append((n,bool(c))); print(("PASS " if c else "FAIL ")+n+(f"  [{extra}]" if extra and not c else ""),flush=True)
def wait_for(fn,timeout=15,step=0.25):
    end=time.time()+timeout
    while time.time()<end:
        try:
            r=fn()
            if r: return r
        except Exception: pass
        time.sleep(step)
    return None
PIX="""() => { const el=document.querySelector('.konvajs-content'); const c=el&&el.querySelectorAll('canvas')[1]; if(!c) return -1; const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n }"""
es_src=open(os.path.join(ROOT,'apps/server/src/data/words/es.ts'),encoding='utf8').read()
ES=set(w.lower() for w in re.findall(r"'([^']+)'",es_src))
with sync_playwright() as p:
    b=p.chromium.launch(); A=b.new_context(viewport={'width':1280,'height':860}).new_page(); B=b.new_context(viewport={'width':1280,'height':860}).new_page(); P=b.new_context().new_page()
    errs=[]; 
    for n,pg in (('A',A),('B',B),('P',P)): pg.on('pageerror',lambda e,n=n: errs.append(f"{n}: {e}"))
    A.goto(WEB+"/create-room"); A.fill('#host-name','Alice')
    A.fill('#rounds','2'); A.fill('#drawing-time','60'); A.fill('#hints','0')
    A.locator('#language').select_option('es')
    A.get_by_role('radio',name=re.compile('Hidden')).click()
    A.locator('#isPublic').click()
    A.get_by_role('button',name='Create room').click(); A.wait_for_url(re.compile('/room/'))
    code=A.url.split('/')[-1]
    P.goto(WEB+"/join"); 
    check('public room is listed on the join page', wait_for(lambda: P.get_by_text('Doodle Den').first.is_visible(),10))
    P.get_by_text('Doodle Den').first.click()
    check('clicking a public room fills in its code', P.input_value('#code')==code)
    B.goto(f"{WEB}/join?code={code}"); B.fill('#player-name','Bob'); B.get_by_role('button',name='Join room').click(); B.wait_for_url(re.compile('/room/'))
    check('lobby summary shows Spanish + hidden mode to guests', wait_for(lambda: B.get_by_text('Español').first.is_visible() and B.locator('dd',has_text='hidden').first.is_visible(),6))
    wait_for(lambda: A.get_by_text('2/8').is_visible()); A.get_by_role('button',name='Start game').click()
    A.wait_for_url(re.compile('/game/')); B.wait_for_url(re.compile('/game/'))
    def dr():
        for n,pg in (('A',A),('B',B)):
            if pg.get_by_text('Your turn to draw').count(): return n
    d=wait_for(dr,15); dp,gp=(A,B) if d=='A' else (B,A)
    texts=[t.strip().lower() for t in dp.locator('div.animate-pop button').all_inner_texts()]
    check('word choices are Spanish words', texts and all(t in ES for t in texts), str(texts))
    dp.locator('div.animate-pop button').first.click(); wait_for(lambda: dp.get_by_role('toolbar').is_visible())
    check('hidden mode: guesser sees no blanks', wait_for(lambda: gp.get_by_text('Hidden word').first.is_visible(),6) and gp.locator('div.font-display[aria-label^="Hint"]').count()==0)
    box=dp.locator('.touch-none-canvas').first.bounding_box()
    def stroke(y, x0=0.1, x1=0.9):
        dp.mouse.move(box['x']+box['width']*x0, box['y']+box['height']*y); dp.mouse.down()
        for i in range(1,30): dp.mouse.move(box['x']+box['width']*(x0+(x1-x0)*i/29), box['y']+box['height']*y)
        dp.mouse.up()
    stroke(0.3); stroke(0.5)
    wait_for(lambda: gp.evaluate(PIX)>200,6); before=gp.evaluate(PIX)
    dp.get_by_label('Eraser').click(); dp.get_by_label('Brush size 22').click()
    box=dp.locator('.touch-none-canvas').first.bounding_box(); stroke(0.3)
    check('eraser removes pixels on the other client too', wait_for(lambda: gp.evaluate(PIX) < before*0.8,6), f'{before}->{gp.evaluate(PIX)}')
    dp.get_by_label('Brush',exact=True).click()
    dp.get_by_label('Clear canvas').click()
    check('clear canvas empties the other client', wait_for(lambda: gp.evaluate(PIX)==0,6), str(gp.evaluate(PIX)))
    check('and the drawer own canvas', dp.evaluate(PIX)==0)
    print('page errors:', errs[:3] or 'none'); b.close()
bad=[n for n,ok in results if not ok]; print(f"\n{len(results)-len(bad)}/{len(results)} passed")
if bad: print('FAILED:',bad); sys.exit(1)

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
def wait_for(fn,timeout=20,step=0.25):
    end=time.time()+timeout
    while time.time()<end:
        try:
            r=fn()
            if r: return r
        except Exception: pass
        time.sleep(step)
    return None
def join(pg,code,name):
    pg.goto(f"{WEB}/join?code={code}"); pg.fill('#player-name',name); pg.get_by_role('button',name=re.compile('Join')).first.click()

with sync_playwright() as p:
    b=p.chromium.launch()
    cx={n:b.new_context(viewport={'width':1280,'height':860}) for n in 'ABC'}
    A,B,C=(cx[n].new_page() for n in 'ABC')
    mob=b.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2); D=mob.new_page()
    errs=[]
    for n,pg in zip('ABCD',(A,B,C,D)):
        pg.on('pageerror',lambda e,n=n: errs.append(f"{n}: {e}"))

    A.goto(f"{WEB}/create-room"); A.fill('#host-name','Alice')
    A.fill('#rounds','2'); A.fill('#drawing-time','15'); A.fill('#hints','2'); A.fill('#word-choices','2')
    A.get_by_label('Add custom words').fill('zorblax, quimby'); A.get_by_role('button',name='Add').click()
    check('custom words appear as chips', A.get_by_text('zorblax').first.is_visible() and A.get_by_text('quimby').first.is_visible())
    A.get_by_label('Add custom words').fill('<<>>'); A.get_by_role('button',name='Add').click()
    check('invalid custom word is rejected with a message', wait_for(lambda: A.get_by_text('Not valid').is_visible(),3))
    A.get_by_label('Add custom words').fill('')
    A.locator('#customOnly').click()
    A.screenshot(path=SHOTS+'/11_create_custom.png',full_page=True)
    A.get_by_role('button',name='Create room').click(); A.wait_for_url(re.compile(r'/room/'),timeout=10000)
    code=A.url.split('/')[-1]
    join(B,code,'Bob'); join(C,code,'Cara')
    B.wait_for_url(re.compile(r'/room/')); C.wait_for_url(re.compile(r'/room/'))
    check('3 players in lobby', wait_for(lambda: A.get_by_text('3/8').is_visible()))
    # ready toggle
    B.get_by_role('button',name='Mark me ready').click()
    check('ready state is shown to the host', wait_for(lambda: A.get_by_label('Players').get_by_text('Ready',exact=True).is_visible(),5))
    # host edits settings in lobby
    A.fill('#rounds','3'); A.get_by_role('button',name='Save settings').click()
    check('host can change settings in the lobby and guests see them', wait_for(lambda: B.get_by_text('Rounds').first.is_visible() and B.locator('dd',has_text='3').first.is_visible(),6))
    time.sleep(1.0); A.fill('#rounds','2'); A.get_by_role('button',name='Save settings').click(); time.sleep(1.0)
    A.get_by_role('button',name='Start game').click()
    for pg in (A,B,C): pg.wait_for_url(re.compile(r'/game/'),timeout=10000)

    pages={'A':A,'B':B,'C':C}
    def drawer():
        for n,pg in pages.items():
            if pg.get_by_text('Your turn to draw').count(): return n
    dn=wait_for(drawer,20); check('a drawer is chosen',dn)
    dp=pages[dn]; guessers=[pg for n,pg in pages.items() if n!=dn]
    opts=dp.locator('div.animate-pop button'); texts=sorted(t.strip().lower() for t in opts.all_inner_texts())
    check('custom-only words are the only choices', texts==['quimby','zorblax'], str(texts))
    opts.first.click()
    wait_for(lambda: dp.get_by_role('toolbar').is_visible())
    label=dp.locator('div.font-display[aria-label]').first.get_attribute('aria-label')
    # D joins as mobile spectator mid-turn
    join(D,code,'Dana'); D.wait_for_url(re.compile(r'/game/'),timeout=10000)
    time.sleep(7)
    g=guessers[0]
    hint=g.locator('div.font-display[aria-label^="Hint"]').first.get_attribute('aria-label')
    shown=re.sub(r'blank ?','',hint.replace('Hint: ',''))
    check('a hint letter has been revealed after ~half the time', len(shown.replace(' ',''))>=1 and len(shown.replace(' ',''))<len(label), f'{hint} vs {label}')
    D.screenshot(path=SHOTS+'/12_mobile_game.png')
    check('nobody guessed: time-up ends the round for everyone', wait_for(lambda: all(pg.get_by_text("Time's up!").first.is_visible() for pg in (A,B,C)),15))
    check('word revealed at round end', g.get_by_text(label, exact=False).first.is_visible() or g.get_by_text('The word was').first.is_visible())

    # ---------- votekick ----------
    wait_for(lambda: not A.get_by_text("Time's up!").first.is_visible(),12)
    B.get_by_label('Actions for Alice').click()
    check('host cannot be vote-kicked (no option offered)', B.get_by_role('menuitem',name='Vote to kick').count()==0)
    B.keyboard.press('Escape')
    B.get_by_label('Actions for Cara').click(); B.get_by_role('menuitem',name='Vote to kick').click()
    check('votekick shows progress to others', wait_for(lambda: A.get_by_text(re.compile(r'Kick Cara\? 1/2')).is_visible(),6))

    A.get_by_role('button',name='Vote',exact=True).click()
    check('majority vote removes the player', wait_for(lambda: C.get_by_text('You were removed',exact=True).is_visible(),8))

    # ---------- network drop + auto-reconnect ----------
    cx['B'].set_offline(True)
    check('offline client shows a connection warning', wait_for(lambda: B.get_by_text(re.compile('Reconnecting|Offline')).first.is_visible(),45))
    check('other players see them as reconnecting', wait_for(lambda: A.get_by_text('reconnecting').first.is_visible(),15))
    cx['B'].set_offline(False)
    check('client reconnects automatically and is Live again', wait_for(lambda: B.get_by_text('Live').first.is_visible(),25))
    check('same seat is restored (not a duplicate player)', wait_for(lambda: A.get_by_label('Players').get_by_text('Bob').count()==1 and A.get_by_text('reconnecting').count()==0,15))

    # ---------- host leaves => migration, early end ----------
    A.get_by_role('button',name='Leave').click(); A.get_by_role('button',name='Leave game').click()
    A.wait_for_url(WEB+'/',timeout=8000)
    check('host migrates to the next player', wait_for(lambda: B.get_by_role('button',name='Play again').is_visible(),10))
    check('game ends gracefully when too few players remain', wait_for(lambda: B.get_by_text('ended early').first.is_visible(),10))
    B.screenshot(path=SHOTS+'/13_early_end.png')
    # dark mode screenshot
    B.get_by_label('Toggle dark mode').click(); time.sleep(0.4); B.screenshot(path=SHOTS+'/14_dark.png')
    # stale link after everyone is gone
    A.goto(f"{WEB}/room/ZZZZZZ"); check('unknown room shows a not-found page', wait_for(lambda: A.get_by_text('Room not found').is_visible(),8))
    print("page errors:",errs[:5] if errs else "none")
    b.close()
bad=[n for n,ok in results if not ok]
print(f"\n{len(results)-len(bad)}/{len(results)} passed"); 
if bad: print("FAILED:",bad); sys.exit(1)

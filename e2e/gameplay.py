import os
SHOTS=os.environ.get('SHOTS_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)),'shots'))
os.makedirs(SHOTS,exist_ok=True)
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
import re, sys, time
from playwright.sync_api import sync_playwright, expect

WEB = "http://localhost:3000"
results = []
def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""), flush=True)

PIX = """(idx) => { const w=[...document.querySelectorAll('.konvajs-content')]; const el = idx===-1? w[w.length-1] : w[idx]; if(!el) return -1;
  const c=el.querySelectorAll('canvas')[1]; if(!c) return -2; const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n }"""

def wait_for(fn, timeout=25, step=0.25):
    end = time.time() + timeout
    while time.time() < end:
        try:
            r = fn()
            if r: return r
        except Exception: pass
        time.sleep(step)
    return None

def draw(page, strokes=1):
    box = page.locator('.touch-none-canvas').first.bounding_box()
    for s in range(strokes):
        y = box['y'] + box['height']*(0.3+0.2*s)
        page.mouse.move(box['x']+box['width']*0.2, y)
        page.mouse.down()
        for i in range(1, 25):
            page.mouse.move(box['x']+box['width']*(0.2+0.025*i), y + (12 if i % 2 else -12))
        page.mouse.up()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctxs = {n: b.new_context(viewport={'width':1280,'height':860}) for n in ('A','B','C')}
    A, B, C = (ctxs[n].new_page() for n in ('A','B','C'))
    errors = []
    for n, pg in zip('ABC', (A,B,C)):
        pg.on('pageerror', lambda e, n=n: errors.append(f"{n}: {e}"))
        pg.on('console', lambda m, n=n: errors.append(f"{n} console: {m.text}") if m.type=='error' and 'favicon' not in m.text else None)

    # ---------- landing ----------
    A.goto(WEB); A.screenshot(path=SHOTS+'/01_landing.png', full_page=True)
    check('landing shows hero + create/join', A.get_by_role('link', name='Create a room').is_visible() and A.get_by_role('button', name='Join room').is_visible())

    # ---------- create room ----------
    A.goto(f"{WEB}/create-room")
    A.get_by_role('button', name='Create room').click()   # name missing -> validation
    check('create without name is blocked with an error', A.locator('#host-name[aria-invalid=true]').count()==1 and '/create-room' in A.url)
    A.fill('#host-name', 'Alice')
    A.fill('#rounds', '2'); A.fill('#drawing-time', '20'); A.fill('#hints', '0')
    A.locator('#customOnly').click()  # custom-only on with 0 words -> must be invalid
    check('custom-only without words disables submit', A.get_by_role('button', name='Create room').is_disabled())
    A.locator('#customOnly').click()
    A.screenshot(path=SHOTS+'/02_create.png', full_page=True)
    A.get_by_role('button', name='Create room').click()
    A.wait_for_url(re.compile(r'/room/[A-Z0-9]{6}$'), timeout=10000)
    code = A.url.rstrip('/').split('/')[-1]
    check(f'room created with code {code}', len(code)==6)
    check('host sees lobby with Start disabled (1 player)', A.get_by_role('button', name='Start game').is_disabled())

    # ---------- join: bad code, then good ----------
    B.goto(f"{WEB}/join?code=ZZZZZZ")
    check('nonexistent room shows an error', wait_for(lambda: B.get_by_text('No room with that code').is_visible()))
    B.goto(f"{WEB}/join?code={code}")
    check('valid code shows room name + player count', wait_for(lambda: B.get_by_text('Doodle Den').first.is_visible()))
    B.fill('#player-name', 'Bob'); B.get_by_role('button', name='Join room').click()
    B.wait_for_url(re.compile(r'/room/'), timeout=10000)
    check('guest lands in lobby', wait_for(lambda: B.get_by_text('Waiting for the host').is_visible()))
    check('host sees both players', wait_for(lambda: A.get_by_label('Players').get_by_text('Bob').is_visible()))
    A.screenshot(path=SHOTS+'/03_lobby_host.png', full_page=True)

    # ---------- reload keeps seat (token reconnect) ----------
    B.reload()
    check('guest reload re-joins same seat (no identity prompt)', wait_for(lambda: B.get_by_text('Waiting for the host').is_visible(), 15))
    check('no duplicate player after reload', A.get_by_label('Players').get_by_text('Bob').count()==1)

    # ---------- start ----------
    A.get_by_role('button', name='Start game').click()
    A.wait_for_url(re.compile(r'/game/'), timeout=10000); B.wait_for_url(re.compile(r'/game/'), timeout=10000)
    check('both players moved to the game screen', True)

    def drawer_page():
        for pg in (A, B):
            if pg.get_by_text('Your turn to draw').count() and pg.get_by_text('Your turn to draw').first.is_visible(): return pg
        return None
    spectated = False
    total_turns = 4
    for turn in range(total_turns):
        dp = wait_for(drawer_page, 25)
        check(f'turn {turn+1}: exactly one drawer gets word choices', dp is not None)
        if dp is None: break
        gp = B if dp is A else A
        if turn == 0: dp.screenshot(path=SHOTS+'/04_wordpick.png')
        other_sees_picker = gp.get_by_text('Your turn to draw').count()
        check(f'turn {turn+1}: guesser does not see the picker', other_sees_picker == 0)
        opts = dp.locator('div.animate-pop button')
        n_opts = opts.count()
        if turn == 0: check('3 word choices offered', n_opts == 3, str(n_opts))
        opts.first.click()
        wait_for(lambda: dp.get_by_role('toolbar').is_visible())
        word = dp.locator('div.font-display[aria-label]').first.get_attribute('aria-label')
        check(f'turn {turn+1}: drawer sees the word', bool(word) and '_' not in word, str(word))
        wait_for(lambda: gp.get_by_text('Guess the word').first.is_visible())
        check(f'turn {turn+1}: guesser has blanks, not the word', gp.locator('div.font-display[aria-label^="Hint"]').count()==1)
        html = gp.content().lower()
        check(f'turn {turn+1}: word absent from guesser DOM', f'>{word.lower()}<' not in html and f'"{word.lower()}"' not in html)
        check(f'turn {turn+1}: guesser has no drawing toolbar', gp.get_by_role('toolbar').count()==0)

        draw(dp, 2)
        ok = wait_for(lambda: gp.evaluate(PIX, 0) > 100, 8)
        check(f'turn {turn+1}: strokes appear on the guesser canvas in real time', ok, str(gp.evaluate(PIX, 0)))
        if turn == 0:
            gp.screenshot(path=SHOTS+'/05_game_guesser.png'); dp.screenshot(path=SHOTS+'/06_game_drawer.png')
            # undo removes a stroke everywhere
            before = gp.evaluate(PIX, 0)
            dp.get_by_label('Undo last stroke').click()
            check('undo shrinks the drawing on the other client', wait_for(lambda: gp.evaluate(PIX, 0) < before, 5), f'{before}->{gp.evaluate(PIX,0)}')
            # a non-drawer cannot paint: hammer the canvas on the guesser page
            before = dp.evaluate(PIX, 0); draw(gp, 1); time.sleep(0.6)
            check('guesser mouse input does not change the drawer canvas', dp.evaluate(PIX, 0) == before)
            # wrong guess shows in chat and gives no points
            gp.get_by_label('Message').fill('totally wrong guess'); gp.get_by_label('Message').press('Enter')
            check('wrong guess is visible to the drawer', wait_for(lambda: dp.get_by_text('totally wrong guess').is_visible(), 5))
            # spectator joins mid-game
            C.goto(f"{WEB}/join?code={code}")
            check('in-progress room tells the joiner they will spectate', wait_for(lambda: C.get_by_text('mid-game').first.is_visible()))
            C.fill('#player-name', 'Cleo'); C.get_by_role('button', name='Join as spectator').click()
            C.wait_for_url(re.compile(r'/game/'), timeout=10000)
            spectated = True
            check('spectator sees the live drawing snapshot', wait_for(lambda: C.evaluate(PIX, 0) > 100, 8), str(C.evaluate(PIX,0)))
            check('spectator has no toolbar and sees Spectating', C.get_by_role('toolbar').count()==0 and C.get_by_text('Spectating').first.is_visible())
            C.screenshot(path=SHOTS+'/07_spectator.png')
            # spectator cannot guess: word in spectator chat must not score
            C.get_by_label('Message').fill(word); C.get_by_label('Message').press('Enter')
            time.sleep(0.6)
            check('spectator typing the word does not end the round', gp.get_by_text('The word was').count()==0)

        # correct guess (messy casing/spacing)
        gp.get_by_label('Message').fill(f'  {word.upper()}  '); gp.get_by_label('Message').press('Enter')
        check(f'turn {turn+1}: correct guess ends the round for everyone', wait_for(lambda: dp.get_by_text('The word was').first.is_visible() and gp.get_by_text('The word was').first.is_visible(), 8))
        if turn == 0:
            gp.screenshot(path=SHOTS+'/08_round_end.png')
            gp.get_by_role('button', name='Replay drawing').click()
            check('replay dialog opens', wait_for(lambda: gp.get_by_text('Round replay').is_visible()))
            check('replay renders the stored strokes on its own canvas', wait_for(lambda: gp.evaluate(PIX, -1) > 50, 8), str(gp.evaluate(PIX,-1)))
            gp.keyboard.press('Escape')
            check('closing replay leaves the live game intact', wait_for(lambda: gp.get_by_text('The word was').first.is_visible()))
        if turn < total_turns-1:
            wait_for(lambda: not dp.get_by_text('The word was').first.is_visible(), 15)

    # ---------- game over ----------
    check('game over screen with a winner (host)', wait_for(lambda: A.get_by_text(re.compile(r' wins!$|^It.s a tie|^Nobody scored')).first.is_visible(), 40))
    check('game over screen with a winner (guest)', wait_for(lambda: B.get_by_text(re.compile(r' wins!$|^It.s a tie|^Nobody scored')).first.is_visible(), 10))
    check('game over visible to the spectator', wait_for(lambda: C.get_by_text(re.compile(r' wins!$|^It.s a tie|^Nobody scored')).first.is_visible(), 10))
    check('leaderboard + turn recap present', A.get_by_text('Final leaderboard').is_visible() and A.get_by_text('Turn by turn').is_visible() and A.get_by_text('Turn 4', exact=True).is_visible())
    A.screenshot(path=SHOTS+'/09_gameover.png', full_page=True)
    A.get_by_role('button', name='Replay').first.click()
    check('replay available from the results screen', wait_for(lambda: A.get_by_text('Round replay').is_visible()))
    A.keyboard.press('Escape')
    check('only the host can restart', B.get_by_role('button', name='Play again').count()==0 and A.get_by_role('button', name='Play again').is_visible())
    A.get_by_role('button', name='Play again').click()
    check('play again returns everyone to the lobby', wait_for(lambda: A.get_by_role('button', name='Start game').is_visible() and B.get_by_text('Waiting for the host').is_visible(), 10))
    check('mid-game spectator is promoted to a player', wait_for(lambda: A.get_by_label('Players').get_by_text('Cleo').is_visible() and A.get_by_text('3/8').is_visible(), 10))

    # ---------- moderation via UI ----------
    A.get_by_label('Actions for Bob').click(); A.get_by_role('menuitem', name='Ban from room').click()
    check('banned player is told', wait_for(lambda: B.get_by_text('You were banned').is_visible(), 8))
    B.goto(f"{WEB}/join?code={code}"); B.fill('#player-name', 'Bob'); B.get_by_role('button', name='Join room').click()
    check('banned player cannot rejoin', wait_for(lambda: B.get_by_text('banned from this room').first.is_visible(), 8))
    C.get_by_label('Actions for Alice').click(); C.get_by_role('menuitem', name='Report').click()
    C.locator('#details').fill('testing'); C.get_by_role('button', name='Send report').click()
    check('report reaches the host', wait_for(lambda: A.get_by_text('1 report').is_visible(), 8))

    # ---------- history page ----------
    A.goto(f"{WEB}/history")
    check('history lists the finished game', wait_for(lambda: A.get_by_text('Doodle Den', exact=False).first.is_visible() and A.get_by_text(' won').first.is_visible(), 8))
    A.screenshot(path=SHOTS+'/10_history.png', full_page=True)

    print("\nconsole/page errors:", errors[:8] if errors else "none")
    b.close()

fails = [n for n, ok in results if not ok]
print(f"\n{len(results)-len(fails)}/{len(results)} checks passed")
if fails: print("FAILED:", fails); sys.exit(1)

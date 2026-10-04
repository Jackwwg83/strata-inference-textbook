"""Optional Playwright QA, not a build dependency.
Normal: python tests/browser_qa.py --url http://127.0.0.1:3000/
Restricted renderer: --render-only (set_content + explicit storage test double).
Install Playwright and a Chromium browser separately for this optional test.
"""
from __future__ import annotations
import argparse, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'dist/index.html').read_text()
parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:3000/')
parser.add_argument('--render-only', action='store_true')
parser.add_argument('--chromium', default=None, help='Optional existing Chromium executable path')
args = parser.parse_args()
report = {'mode': 'set_content; storage test double' if args.render_only else 'HTTP; native localStorage', 'passed': [], 'limitations': [], 'screenshots': []}
if args.render_only:
    report['limitations'] = ['Navigation to HTTP/file URLs is blocked by this environment browser policy. No policy was changed.', 'DOM, layouts and interactions use set_content. localStorage persistence uses an explicit in-memory test double.', 'Actual browser disk persistence, native download delivery, Safari and a live Vercel deployment have not been verified here.']

def check(value, label):
    if not value: raise AssertionError(label)
    report['passed'].append(label)

STORAGE = """(seed)=>{const m=new Map(Object.entries(seed));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}});window.__storageDump=()=>Object.fromEntries(m);} """

def load(page, seed=None):
    if args.render_only:
        page.evaluate(STORAGE, seed or {})
        page.set_content(HTML)
    else:
        page.goto(args.url)
    page.wait_for_function('!!window.Textbook')

def goto(page, route):
    page.evaluate('(r)=>location.hash=r', '#'+route)
    page.wait_for_function('(r)=>location.hash==="#"+r',arg=route)
    page.wait_for_timeout(15)

with sync_playwright() as p:
    launch={'headless':True}
    if args.chromium: launch['executable_path']=args.chromium
    browser=p.chromium.launch(**launch)
    report['browser']=browser.version
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page(); errors=[]; requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    load(page)
    routes=['home']+page.evaluate('Textbook.book.chapters.map(c=>"chapter/"+c.id)')+page.evaluate('Textbook.book.labs.map(c=>"lab/"+c.id)')+page.evaluate('Textbook.book.sources.map(s=>"source/"+s.id)')+['labs','map','teacher','sources','notes','glossary']
    for width in [1440,768,375]:
        page.set_viewport_size({'width':width,'height':900})
        for route in routes:
            goto(page,route)
            check(page.locator('#main h1').count()>=1,f'{width}px {route}: rendered')
            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{width}px {route}: no document overflow')
            if route.startswith('lab/'):
                check(page.locator('.lab-result [role=alert]').count()==0,f'{width}px {route}: default computation')
    # All interactive control endpoints and all select options.
    for lid in page.evaluate('Textbook.book.labs.map(l=>l.id)'):
        goto(page,'lab/'+lid)
        for e in page.locator('.lab-controls input[type=range]').all():
            for bound in ['min','max']:
                e.evaluate('(e,b)=>{e.value=e[b];e.dispatchEvent(new Event("input",{bubbles:true}));}',bound)
                check(page.locator('.lab-result [role=alert]').count()==0,f'{lid}: {e.get_attribute("name")} {bound}')
            page.locator('.reset-lab').click()
        for s in page.locator('.lab-controls select').all():
            for value in s.locator('option').evaluate_all('(es)=>es.map(e=>e.value)'):
                s.select_option(value)
                check(page.locator('.lab-result [role=alert]').count()==0,f'{lid}: {s.get_attribute("name")}={value}')
            page.locator('.reset-lab').click()
    goto(page,'lab/journey');page.locator('[data-journey="4"]').click()
    check(page.locator('.focus-panel h2').inner_text()=='验证与提交','journey stage buttons')
    goto(page,'lab/cache');page.locator('input[name=trace]').fill('a,1')
    check(page.locator('.lab-result [role=alert]').count()==1,'invalid cache input rejected')
    page.locator('.reset-lab').click()
    goto(page,'lab/scheduler');page.locator('input[name=lengths]').fill('0,3')
    check(page.locator('.lab-result [role=alert]').count()==1,'invalid scheduler lengths rejected')
    page.locator('.reset-lab').click()
    # Chapter interaction and accessible feedback.
    page.set_viewport_size({'width':1440,'height':1000});goto(page,'chapter/01')
    page.locator('.check-answer').first.click()
    check('先选择' in page.locator('.feedback').first.inner_text(),'quiz requires selection')
    page.locator('.quiz').first.locator('input[value="1"]').check();page.locator('.check-answer').first.click()
    check('回答正确' in page.locator('.feedback').first.inner_text(),'quiz answer and explanation')
    page.locator('#complete-chapter').click();page.locator('#bookmark-chapter').click()
    page.locator('#chapter-note').fill('QA 笔记：token 历史与状态对应；<img src=x onerror=alert(1)>')
    size=page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--reading-size")')
    page.locator('#font-larger').click()
    check(page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--reading-size")')!=size,'font size control')
    goto(page,'notes')
    check(page.locator('.saved-note img').count()==0,'notes render text safely')
    check('QA 笔记' in page.locator('#main').inner_text(),'chapter note persisted across route')
    # Search includes body text, not only titles.
    page.locator('#search-button').click();page.locator('#global-search').fill('层—专家')
    check(page.locator('.search-result').count()>0,'full body search finds term')
    page.locator('.search-result').first.click();check(not page.locator('#search-dialog').is_visible(),'search closes after selection')
    page.keyboard.press('Control+k');check(page.locator('#search-dialog').is_visible(),'search keyboard shortcut');page.keyboard.press('Escape')
    goto(page,'glossary');page.locator('#glossary-query').fill('SSE');check(page.locator('#glossary-results .term').count()>0,'glossary search')
    # Capture export payload before browser download restrictions. No native-delivery assertion.
    page.evaluate("""()=>{window.__exports=[];URL.createObjectURL=(b)=>{window.__exports.push(b);return 'blob:qa-export'};URL.revokeObjectURL=()=>{};document.addEventListener('click',e=>{if(e.target.closest('a[download]'))e.preventDefault()},true);} """)
    goto(page,'lab/kv');page.locator('#save-experiment').click();page.locator('#export-experiment').click()
    lab_export=json.loads(page.evaluate('()=>window.__exports.at(-1).text()'))
    check(lab_export['lab']=='kv' and '教学' in lab_export['kind'],'lab export JSON and scope marker')
    goto(page,'notes');page.locator('#export-progress').click()
    record=json.loads(page.evaluate('()=>window.__exports.at(-1).text()'))
    check('01' in record['completed'] and '01' in record['bookmarks'] and len(record['experiments'])==1,'progress export includes all record categories')
    record['notes']['02']='导入恢复测试'
    page.once('dialog',lambda d:d.accept())
    page.locator('#import-file').set_input_files({'name':'record.json','mimeType':'application/json','buffer':json.dumps(record,ensure_ascii=False).encode()})
    page.wait_for_timeout(80)
    check('导入恢复测试' in page.locator('#main').inner_text(),'JSON file import restores validated record')
    check(page.evaluate('()=>{try{Textbook.validateRecord({schema:9});return false}catch{return true}}'),'invalid record schema rejected')
    # Round trip initialization; mocked storage is explicitly reported in render-only mode.
    saved=page.evaluate('localStorage.getItem("strata-textbook.v1")')
    fresh=context.new_page();load(fresh,{'strata-textbook.v1':saved})
    goto(fresh,'notes');check('导入恢复测试' in fresh.locator('#main').inner_text(),'record serialization/reinitialization round trip')
    fresh.close()
    # Static/print export and source links.
    full=page.evaluate('Textbook.makeFullBook()')
    check(full.count('class="chapter-print"')>=28 and '上游源码许可' in full,'fullbook export contains chapters, solutions and MIT notice')
    check(page.evaluate('Textbook.book.sources.filter(s=>s.path).every(s=>s.url.includes(Textbook.book.provenance.commit))'),'fixed-commit source links')
    check(len(errors)==0,'zero JavaScript page errors')
    if args.render_only: check(not any(u.startswith('http') for u in requests),'zero remote runtime asset requests')
    # Screenshots use normal-looking empty learning state; storage is still a declared test double.
    shot=context.new_page();load(shot)
    out=ROOT/'docs/screenshots';out.mkdir(parents=True,exist_ok=True)
    for route,width,height,name in [('home',1440,1000,'home-desktop'),('chapter/17',1440,1050,'chapter-desktop'),('lab/spec',1440,1100,'lab-spec-desktop'),('home',375,950,'home-mobile'),('lab/kv',375,950,'lab-kv-mobile')]:
        shot.set_viewport_size({'width':width,'height':height});goto(shot,route);shot.wait_for_timeout(120)
        shot.screenshot(path=str(out/(name+'.png')),full_page=False)
        report['screenshots'].append(name+'.png')
    shot.locator('#theme-button').click();shot.set_viewport_size({'width':1440,'height':1000});goto(shot,'home')
    check(shot.evaluate('document.documentElement.dataset.theme')=='dark','dark theme')
    shot.screenshot(path=str(out/'home-dark.png'));report['screenshots'].append('home-dark.png')
    shot.set_viewport_size({'width':375,'height':900});shot.locator('#menu-button').click()
    check(shot.locator('#menu-button').get_attribute('aria-expanded')=='true','mobile menu opens with aria state')
    shot.locator('#sidebar a[href="#chapter/01"]').click();shot.wait_for_function('document.getElementById("menu-button").getAttribute("aria-expanded")=="false"');check(shot.locator('#menu-button').get_attribute('aria-expanded')=='false','mobile navigation closes menu')
    # Storage-unavailable mode should not lie about persistence.
    if args.render_only:
        failed=context.new_page();failed.set_content(HTML)
        check(failed.locator('#storage-alert').is_visible(),'blocked storage shows durable warning')
        failed.close()
    # Fullbook is a separate zero-JS rendering.
    static=context.new_page();static.set_content((ROOT/'dist/fullbook.html').read_text());static.set_viewport_size({'width':375,'height':900})
    check(static.locator('section[id^=chapter-]').count()==28,'static fullbook has all 28 chapters')
    check(static.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'static fullbook mobile document overflow')
    report['route_count']=len(routes);report['viewport_count']=3;report['page_errors']=errors
    report['assertions_passed']=len(report['passed']);report['date']='2026-10-04'
    browser.close()
(ROOT/'docs/browser-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='passed'},ensure_ascii=False,indent=2))

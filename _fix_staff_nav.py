import re
from pathlib import Path

root = Path(__file__).resolve().parent
nav_re = re.compile(
    r'\s*<li class="nav-item"><a class="nav-link"[^>]*href="new(?:%20| )intranet/index.html"[^>]*>[\s\S]*?</li>',
    re.I,
)
widget_re = re.compile(
    r'(<div class="sisf-widget-holder sisf--two d-flex align-items-center ms-auto)(">\s*<div class="header-btn">[\s\S]*?</div>\s*)(</div>)',
    re.I,
)
portal = (
    '                     <a href="new%20intranet/index.html" class="header-staff-portal"'
    ' aria-label="Staff intranet" title="Staff Intranet">\n'
    '                        <i class="fa-solid fa-user-tie" aria-hidden="true"></i>\n'
    '                     </a>\n'
)
mobile = (
    '               <a href="new%20intranet/index.html" class="header-staff-portal header-staff-portal--mobile"'
    ' aria-label="Staff intranet" title="Staff Intranet">'
    '<i class="fa-solid fa-user-tie" aria-hidden="true"></i></a>\n'
)

for path in root.glob("*.html"):
    text = path.read_text(encoding="utf-8")
    orig = text
    text = nav_re.sub("", text)
    if "header-staff-portal" not in text:
        if widget_re.search(text):
            text = widget_re.sub(r"\1 gap-3\2" + portal + r"\3", text, count=1)
        if "header-staff-portal--mobile" not in text:
            text = text.replace(
                '<div class="navbar-toggle"></div>',
                mobile + '               <div class="navbar-toggle"></div>',
                1,
            )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print("updated", path.name)
    else:
        print("unchanged", path.name)

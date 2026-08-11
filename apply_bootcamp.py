import re
import os

with open('c:/Users/GaneshBhat/Documents/PROD/index.html', 'r', encoding='utf-8') as f:
    src = f.read()

# Extract styles
style_start = src.find('<style>')
style_end = src.find('</style>') + len('</style>')
styles = src[style_start:style_end]

# Extract fonts
font_start = src.find('<link rel="preconnect" href="https://fonts.googleapis.com">')
font_end = src.find('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">') + len('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">')
fonts = src[font_start:font_end]

# Extract banner and nav
banner_start = src.find('<div id="top-banner">')
nav_end = src.find('</nav>') + len('</nav>\n      </div>\n    </div>\n    <div id="mobile-nav">')
nav_end = src.find('</div>', nav_end) + 7
nav_end = src.find('</div>', nav_end) + 7
nav_block = src[banner_start:nav_end]

# Extract footer
footer_start = src.find('<footer')
footer_end = src.find('</footer>') + len('</footer>')
footer_block = src[footer_start:footer_end]

with open('c:/Users/GaneshBhat/Documents/PROD/apa-bootcamp.html', 'r', encoding='utf-8') as f:
    tgt = f.read()

# Replace fonts
tgt = re.sub(r'<!-- Google Fonts -->.*?rel="stylesheet">', fonts, tgt, flags=re.DOTALL)
# Add styles right before </head>
tgt = re.sub(r'</head>', styles + '\n</head>', tgt)
# Replace header
tgt = re.sub(r'<!-- Navigation -->\s*<header class="navbar.*?</header>', nav_block, tgt, flags=re.DOTALL)
# Replace footer
tgt = re.sub(r'<footer class="footer.*?</footer>', footer_block, tgt, flags=re.DOTALL)

with open('c:/Users/GaneshBhat/Documents/PROD/apa-bootcamp.html', 'w', encoding='utf-8') as f:
    f.write(tgt)

print('Wrote apa-bootcamp.html')

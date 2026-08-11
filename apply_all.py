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

html_files = ['apa-bootcamp.html', 'courses.html', 'about-mentor.html', 'blog.html', 'badge-generator.html', 'coming-soon.html']
for hf in html_files:
    filepath = 'c:/Users/GaneshBhat/Documents/PROD/' + hf
    if not os.path.exists(filepath): continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        tgt = f.read()
    
    # Replace fonts
    tgt = re.sub(r'<!-- Google Fonts -->.*?rel="stylesheet">', fonts, tgt, flags=re.DOTALL)
    # Add styles right before </head> if they aren't already there
    if '<style>' not in tgt:
        tgt = re.sub(r'</head>', styles + '\n</head>', tgt)
    else:
        # replace existing style block
        tgt = re.sub(r'<style>.*?</style>', styles, tgt, flags=re.DOTALL)
        
    # Replace header
    if '<!-- Navigation -->' in tgt:
        tgt = re.sub(r'<!-- Navigation -->\s*<header class="navbar.*?</header>', nav_block, tgt, flags=re.DOTALL)
    else:
        # fallback
        tgt = re.sub(r'<header class="navbar.*?</header>', nav_block, tgt, flags=re.DOTALL)
        
    # Replace footer
    tgt = re.sub(r'<footer class="footer.*?</footer>', footer_block, tgt, flags=re.DOTALL)
    
    # Fix links
    tgt = tgt.replace('href="#', 'href="index.html#')
    tgt = tgt.replace('href="index.html#"', 'href="index.html"')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(tgt)
    print('Updated ' + hf)

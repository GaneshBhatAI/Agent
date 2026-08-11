import re
import os

def apply_theme(target_file, source_file):
    with open(source_file, 'r', encoding='utf-8') as f:
        src = f.read()
    
    # Extract style block
    style_match = re.search(r'(<style>.*?</style>)', src, re.DOTALL)
    if not style_match:
        print("No style found in source")
        return
    style_str = style_match.group(1)
    
    # Extract banner and nav
    banner_nav_match = re.search(r'(<div id="top-banner">.*?</nav>\s*</div>\s*</div>)', src, re.DOTALL)
    if not banner_nav_match:
        print("No banner/nav found in source")
        return
    banner_nav_str = banner_nav_match.group(1)
    
    # Extract footer
    footer_match = re.search(r'(<footer.*?>.*?</footer>)', src, re.DOTALL)
    if not footer_match:
        print("No footer found in source")
        return
    footer_str = footer_match.group(1)
    
    with open(target_file, 'r', encoding='utf-8') as f:
        target = f.read()
        
    # Replace style
    # Target might have <link rel="stylesheet" href="assets/css/style.css"> or <style>
    target = re.sub(r'<style>.*?</style>', style_str, target, flags=re.DOTALL)
    
    # Replace header/nav
    # It might be in a header or directly in body
    # Let's see if we can find the old nav
    target = re.sub(r'<header.*?>.*?</header>', banner_nav_str, target, flags=re.DOTALL)
    
    # Replace footer
    target = re.sub(r'<footer.*?>.*?</footer>', footer_str, target, flags=re.DOTALL)
    
    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(target)
    print(f"Applied theme to {target_file}")

html_files = [
    'apa-bootcamp.html',
    'courses.html',
    'about-mentor.html',
    'blog.html',
    'badge-generator.html',
    'coming-soon.html'
]

src_file = 'c:/Users/GaneshBhat/Documents/PROD/aylence-redesign/index.html'
base_dir = 'c:/Users/GaneshBhat/Documents/PROD/'

for f in html_files:
    path = os.path.join(base_dir, f)
    if os.path.exists(path):
        apply_theme(path, src_file)

import os, glob

for f in glob.glob('**/*.html', recursive=True):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content.replace('<a href="about-mentor.html">About Mentor</a>', '<a href="about-mentor.html" onclick="toggleMobileNav()">About Mentor</a>')
    
    if content != new_content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f'Updated {f}')

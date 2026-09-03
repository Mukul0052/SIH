import os
import glob
import re

frontend_dir = 'frontend/src/pages'
files = glob.glob(os.path.join(frontend_dir, '*.tsx'))

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(r'`http://localhost:8000(/.*?)`', r'`\1`', content).replace('`', '')
    content = re.sub(r""'http://localhost:8000(/.*?)'"", r""import.meta.env.VITE_API_BASE_URL + '\1'"", content)
    content = re.sub(r'\"http://localhost:8000(/.*?)\"', r'import.meta.env.VITE_API_BASE_URL + \"\1\"', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print('Replacement complete.')

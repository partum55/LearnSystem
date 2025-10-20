import re
with open('CourseDetail.tsx', 'r') as f:
    content = f.read()
# Fix module.published to module.is_published
content = re.sub(r'module\.published\b', 'module.is_published', content)
# Remove module.resources references - these should be loaded separately
# Find and comment out the module.resources section
content = re.sub(
    r'(\s+)\{module\.resources && module\.resources\.length > 0 \? \(\s+<div className="space-y-2">\s+\{module\.resources\.map\(\(resource: Resource\) => \([^}]+\}\)\)\}\s+</div>\s+\) : \(\s+<p[^>]+>[^<]+</p>\s+\)\}',
    r'\1{/* Resources are loaded separately via moduleResources state */}',
    content,
    flags=re.DOTALL
)
with open('CourseDetail.tsx', 'w') as f:
    f.write(content)
print("Fixed CourseDetail.tsx type errors")

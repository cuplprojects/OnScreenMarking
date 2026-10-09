import os
import re

directory = r"d:\OnScreenMarking\UI\src\pages"

def process_classes(class_str):
    # Don't touch if it has dynamic templating that's too complex
    # but we can do a simple string replace if we are careful
    classes = class_str.split()
    new_classes = set(classes)
    
    # 1. Grids
    if 'grid-cols-2' in classes and 'md:grid-cols-2' not in classes:
        new_classes.remove('grid-cols-2')
        new_classes.add('grid-cols-1')
        new_classes.add('md:grid-cols-2')
        
    if 'grid-cols-3' in classes and 'lg:grid-cols-3' not in classes:
        new_classes.remove('grid-cols-3')
        new_classes.add('grid-cols-1')
        new_classes.add('sm:grid-cols-2')
        new_classes.add('lg:grid-cols-3')
        
    if 'grid-cols-4' in classes and 'lg:grid-cols-4' not in classes:
        new_classes.remove('grid-cols-4')
        new_classes.add('grid-cols-1')
        new_classes.add('sm:grid-cols-2')
        new_classes.add('lg:grid-cols-4')

    if 'grid-cols-5' in classes and 'lg:grid-cols-5' not in classes:
        new_classes.remove('grid-cols-5')
        new_classes.add('grid-cols-1')
        new_classes.add('sm:grid-cols-3')
        new_classes.add('lg:grid-cols-5')

    # 2. Padding
    if 'p-8' in classes and 'md:p-8' not in classes:
        new_classes.remove('p-8')
        new_classes.add('p-4')
        new_classes.add('md:p-8')
        
    if 'p-6' in classes and 'md:p-6' not in classes:
        new_classes.remove('p-6')
        new_classes.add('p-4')
        new_classes.add('md:p-6')

    if 'px-8' in classes and 'md:px-8' not in classes:
        new_classes.remove('px-8')
        new_classes.add('px-4')
        new_classes.add('md:px-8')
        
    if 'px-6' in classes and 'md:px-6' not in classes:
        new_classes.remove('px-6')
        new_classes.add('px-4')
        new_classes.add('md:px-6')
        
    # 3. Widths (for columns that aren't grid)
    widths = ['1/2', '1/3', '1/4', '2/3', '3/4']
    for w in widths:
        cls = f'w-{w}'
        if cls in classes and f'md:{cls}' not in classes:
            new_classes.remove(cls)
            new_classes.add('w-full')
            new_classes.add(f'md:{cls}')
            
    # Keep the original order as much as possible, just append new ones
    final_classes = []
    for c in classes:
        if c in new_classes:
            final_classes.append(c)
            new_classes.remove(c)
    # add the rest
    final_classes.extend(list(new_classes))
    
    return " ".join(final_classes)

def replace_classnames(content):
    # Regex to find className="..." or className={'...'}
    # This handles simple classNames. 
    def replacer(match):
        prefix = match.group(1)
        quote = match.group(2)
        class_str = match.group(3)
        suffix = match.group(4)
        
        # if it contains ${ or javascript, we can still replace the literal parts safely
        # but let's just process the whole string. process_classes is safe for non-matching parts.
        new_class_str = process_classes(class_str)
        return f"{prefix}{quote}{new_class_str}{suffix}"
        
    # Matches className="classes" or className={`classes ${var}`}
    # We will just replace inside the quotes/backticks
    pattern = r'(className=)(["\'`])(.*?)(["\'`])'
    content = re.sub(pattern, replacer, content, flags=re.DOTALL)
    return content

def wrap_tables(content):
    # Instead of wrapping the table which breaks JSX if not careful,
    # we just add responsive classes to the table tag itself
    # A block table with overflow-x-auto behaves well on mobile
    def table_replacer(match):
        table_tag = match.group(0)
        if 'md:table' in table_tag:
            return table_tag # already processed
            
        if 'className=' in table_tag:
            # Insert our classes into existing className
            def class_injector(m):
                return m.group(1) + m.group(2) + " block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal " + m.group(3) + m.group(4)
            return re.sub(r'(className=)(["\'`])(.*?)(["\'`])', class_injector, table_tag)
        else:
            # Add className
            return table_tag.replace('<table', '<table className="block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal"')
            
    content = re.sub(r'<table[^>]*>', table_replacer, content)
    return content


count = 0
for filename in os.listdir(directory):
    if filename.endswith(".jsx"):
        path = os.path.join(directory, filename)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = replace_classnames(content)
        new_content = wrap_tables(new_content)
        
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filename}")
            count += 1

print(f"Updated {count} files.")

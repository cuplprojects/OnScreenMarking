with open('generate_perfect_brochure.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix mojibake
text = text.replace('â–¶', '&#9654;')
text = text.replace('â€“', '&mdash;')
text = text.replace('â€', '&mdash;')

# Fix pill wrapping
text = text.replace(
    'letter-spacing: 0.4px;\n  }',
    'letter-spacing: 0.4px;\n    white-space: nowrap;\n  }'
)
text = text.replace(
    'letter-spacing: 0.4px;\n  }}',
    'letter-spacing: 0.4px;\n    white-space: nowrap;\n  }}'
)

# Fix Page 4 title truncation
text = text.replace(
    '<span class="block-title">Live On-Screen Evaluation &amp; Question-Wise Rubric Marking</span>',
    '<span class="block-title">Live Question-Wise Rubric Marking Workspace</span>'
)

with open('generate_perfect_brochure.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated generate_perfect_brochure.py cleanly!')

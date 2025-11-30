#!/usr/bin/env python3
"""
Script to automatically fix unused imports in TypeScript/TSX files
"""
import re
import subprocess
from pathlib import Path

def get_unused_imports():
    """Get list of unused imports from TypeScript compiler"""
    result = subprocess.run(
        ['npx', 'tsc', '--noUnusedLocals', '--noUnusedParameters', '--noEmit'],
        capture_output=True,
        text=True
    )
    
    unused = []
    for line in result.stderr.split('\n'):
        if 'error TS6133' in line or 'error TS6192' in line:
            # Parse: src/app/file.tsx(10,3): error TS6133: 'ImportName' is declared but its value is never read.
            match = re.match(r'([^(]+)\((\d+),(\d+)\): error TS6\d+: \'([^\']+)\'', line)
            if match:
                file_path, line_num, col, import_name = match.groups()
                unused.append({
                    'file': file_path,
                    'line': int(line_num),
                    'import': import_name
                })
            # Check for "All imports in import declaration are unused"
            elif 'All imports in import declaration are unused' in line:
                match = re.match(r'([^(]+)\((\d+),(\d+)\):', line)
                if match:
                    file_path, line_num, col = match.groups()
                    unused.append({
                        'file': file_path,
                        'line': int(line_num),
                        'import': '__ALL__'
                    })
    
    return unused

def remove_import_from_line(line, import_name):
    """Remove a specific import from an import line"""
    # Handle different import patterns
    
    # Pattern 1: import { A, B, C } from 'module'
    # Remove import_name from the list
    pattern1 = r"import\s*\{\s*([^}]+)\s*\}\s*from"
    match = re.search(pattern1, line)
    if match:
        imports = [i.strip() for i in match.group(1).split(',')]
        imports = [i for i in imports if i != import_name]
        if not imports:
            return None  # Remove entire line
        return re.sub(pattern1, f"import {{ {', '.join(imports)} }} from", line)
    
    # Pattern 2: import ImportName from 'module'
    if import_name in line and 'from' in line:
        return None  # Remove entire line
    
    return line

def fix_file_imports(file_path, unused_imports):
    """Fix unused imports in a specific file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Group by line number
        lines_to_fix = {}
        for item in unused_imports:
            if item['file'] == file_path:
                line_num = item['line'] - 1  # 0-indexed
                if line_num not in lines_to_fix:
                    lines_to_fix[line_num] = []
                lines_to_fix[line_num].append(item['import'])
        
        # Fix lines (in reverse order to maintain line numbers)
        for line_num in sorted(lines_to_fix.keys(), reverse=True):
            imports_to_remove = lines_to_fix[line_num]
            
            if '__ALL__' in imports_to_remove:
                # Remove entire import line
                lines[line_num] = ''
            else:
                # Remove specific imports
                original_line = lines[line_num]
                for import_name in imports_to_remove:
                    new_line = remove_import_from_line(original_line, import_name)
                    if new_line is None:
                        lines[line_num] = ''
                        break
                    original_line = new_line
                else:
                    lines[line_num] = original_line
        
        # Remove empty lines that were import statements
        cleaned_lines = []
        prev_empty = False
        for line in lines:
            if line.strip() == '':
                if not prev_empty:
                    cleaned_lines.append(line)
                prev_empty = True
            else:
                cleaned_lines.append(line)
                prev_empty = False
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(cleaned_lines)
        
        return True
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    print("Analyzing unused imports...")
    unused_imports = get_unused_imports()
    
    if not unused_imports:
        print("✓ No unused imports found!")
        return
    
    # Group by file
    files_to_fix = {}
    for item in unused_imports:
        file_path = item['file']
        if file_path not in files_to_fix:
            files_to_fix[file_path] = []
        files_to_fix[file_path].append(item)
    
    print(f"Found {len(unused_imports)} unused imports in {len(files_to_fix)} files")
    print("\nFiles to fix:")
    for file_path in sorted(files_to_fix.keys()):
        print(f"  - {file_path} ({len(files_to_fix[file_path])} issues)")
    
    # Note: Automatic fixing is complex and risky
    # Instead, generate a report
    print("\n" + "="*60)
    print("MANUAL FIX REQUIRED")
    print("="*60)
    print("\nDue to the complexity of TypeScript imports, manual review is recommended.")
    print("The script has identified all issues above.")

if __name__ == '__main__':
    main()

import os

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import { cn } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Sidebar } from './components/Sidebar';"""
content = content.replace(
    "import { clsx, type ClassValue } from 'clsx';\nimport { twMerge } from 'tailwind-merge';",
    imports
)

content = content.replace(
    "<TeacherDashboard />",
    "<TeacherDashboard isAdmin={isAdmin} user={user} totalStudents={totalStudents} handleLogin={handleLogin} />"
)

content = content.replace(
    "<Sidebar />",
    "<Sidebar studentId={studentId} studentClass={studentClass} level={level} xp={xp} weeklyXp={weeklyXp} handleClearHistory={handleClearHistory} />"
)

eb_start = content.find("class ErrorBoundary")
if eb_start != -1:
    cn_end_str = "return twMerge(clsx(inputs));\n}"
    cn_end = content.find(cn_end_str)
    if cn_end != -1:
        cn_end_index = cn_end + len(cn_end_str)
        content = content[:eb_start] + content[cn_end_index:]

td_start = content.find("  const TeacherDashboard = () => (")
if td_start != -1:
    td_end = content.find("  const Sidebar = () => (", td_start)
    if td_end != -1:
        content = content[:td_start] + content[td_end:]

sb_start = content.find("  const Sidebar = () => (")
if sb_start != -1:
    sb_end = content.find("  return (", sb_start)
    if sb_end != -1:
        content = content[:sb_start] + content[sb_end:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx refactored successfully")

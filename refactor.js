const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const imports = `import { cn } from './lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Sidebar } from './components/Sidebar';`;

content = content.replace(
    "import { clsx, type ClassValue } from 'clsx';\nimport { twMerge } from 'tailwind-merge';",
    imports
);

content = content.replace(
    "<TeacherDashboard />",
    "<TeacherDashboard isAdmin={isAdmin} user={user} totalStudents={totalStudents} handleLogin={handleLogin} />"
);

content = content.replace(
    "<Sidebar />",
    "<Sidebar studentId={studentId} studentClass={studentClass} level={level} xp={xp} weeklyXp={weeklyXp} handleClearHistory={handleClearHistory} />"
);

const eb_start = content.indexOf("class ErrorBoundary");
if (eb_start !== -1) {
    const cn_end_str = "return twMerge(clsx(inputs));\n}";
    const cn_end = content.indexOf(cn_end_str);
    if (cn_end !== -1) {
        const cn_end_index = cn_end + cn_end_str.length;
        content = content.substring(0, eb_start) + content.substring(cn_end_index);
    }
}

const td_start = content.indexOf("  const TeacherDashboard = () => (");
if (td_start !== -1) {
    const td_end = content.indexOf("  const Sidebar = () => (", td_start);
    if (td_end !== -1) {
        content = content.substring(0, td_start) + content.substring(td_end);
    }
}

const sb_start = content.indexOf("  const Sidebar = () => (");
if (sb_start !== -1) {
    const sb_end = content.indexOf("  return (", sb_start);
    if (sb_end !== -1) {
        content = content.substring(0, sb_start) + content.substring(sb_end);
    }
}

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("App.tsx refactored successfully");

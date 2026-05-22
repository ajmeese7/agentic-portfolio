const path = require("path");

const repoRoot = __dirname;
const logsDir = path.join(repoRoot, "logs");

module.exports = {
	apps: [
		{
			name: "agentic-portfolio",
			script: "/bin/bash",
			args: ["-c", "pnpm start"],
			cwd: repoRoot,
			instances: 1,
			exec_mode: "fork",
			autorestart: true,
			watch: false,
			max_memory_restart: "1G",
			error_file: path.join(logsDir, "pm2-error.log"),
			out_file: path.join(logsDir, "pm2-out.log"),
			log_date_format: "YYYY-MM-DD HH:mm:ss Z",
			merge_logs: true,
			env: {
				NODE_ENV: "production",
			},
		},
	],
};

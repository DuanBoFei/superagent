export const BLACKLIST = [
  "Bash:rm -rf /*",
  "Bash:rm -rf ~*",
  "Bash:curl * | bash",
  "Bash:curl * | sh",
  "Bash:wget * | bash",
  "Bash:eval *",
  "Bash:sudo *",
  "Bash:git push --force *",
  "Bash:git push -f *",
  "Bash:chmod 777 *",
  "Write:/etc/*",
  "Write:~/.ssh/*",
] as const;

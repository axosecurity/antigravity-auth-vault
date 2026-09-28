/**
 * Universal Antigravity Auth Vault
 * Shell Autocompletion Generator & Automated Installer
 * Bash • Zsh • Fish • PowerShell
 */

const fs = require('fs');
const path = require('path');
const { HOME, CYAN, GREEN, YELLOW, BOLD, NC } = require('./config');

function getBashCompletionScript() {
  return [
    '# Bash completion for ag-auth and @',
    '_ag_auth_completions() {',
    '    local cur prev words cword',
    '    if declare -F _init_completion >/dev/null 2>&1; then',
    '        _init_completion -n : 2>/dev/null || { cur="${COMP_WORDS[COMP_CWORD]}"; prev="${COMP_WORDS[COMP_CWORD-1]}"; }',
    '    else',
    '        cur="${COMP_WORDS[COMP_CWORD]}"',
    '        prev="${COMP_WORDS[COMP_CWORD-1]}"',
    '    fi',
    '',
    '    local commands="switch quota list current save detach delete db completion uninstall version help"',
    '    local flags="--refresh -r --force -f --surface -s --help -h --version -v"',
    '    local surfaces="all cli ide app"',
    '    local db_cmds="setup status push pull sync auto-sync daemon disconnect"',
    '',
    '    if [[ ${COMP_CWORD} -eq 1 ]]; then',
    '        if [[ "$1" == "@" ]]; then',
    '            local profiles=$(ag-auth _profiles 2>/dev/null)',
    '            COMPREPLY=($(compgen -W "$profiles $flags" -- "$cur"))',
    '        else',
    '            COMPREPLY=($(compgen -W "$commands $flags" -- "$cur"))',
    '        fi',
    '        return 0',
    '    fi',
    '',
    '    case "$prev" in',
    '        switch|quota|delete|use|rm)',
    '            local profiles=$(ag-auth _profiles 2>/dev/null)',
    '            COMPREPLY=($(compgen -W "$profiles $flags" -- "$cur"))',
    '            return 0',
    '            ;;',
    '        db)',
    '            COMPREPLY=($(compgen -W "$db_cmds" -- "$cur"))',
    '            return 0',
    '            ;;',
    '        --surface|-s)',
    '            COMPREPLY=($(compgen -W "$surfaces" -- "$cur"))',
    '            return 0',
    '            ;;',
    '        completion)',
    '            COMPREPLY=($(compgen -W "bash zsh fish powershell install" -- "$cur"))',
    '            return 0',
    '            ;;',
    '        *)',
    '            if [[ "$cur" == -* ]]; then',
    '                COMPREPLY=($(compgen -W "$flags" -- "$cur"))',
    '            else',
    '                local profiles=$(ag-auth _profiles 2>/dev/null)',
    '                COMPREPLY=($(compgen -W "$profiles" -- "$cur"))',
    '            fi',
    '            return 0',
    '            ;;',
    '    esac',
    '}',
    'complete -F _ag_auth_completions ag-auth',
    'complete -F _ag_auth_completions @'
  ].join('\n') + '\n';
}

function getZshCompletionScript() {
  return [
    '#compdef ag-auth @',
    '',
    '_ag_auth() {',
    '    local -a commands',
    '    commands=(',
    '        \'switch:Switch active Antigravity account (interactive arrow picker or direct email)\'',
    '        \'quota:Display real-time AI quota dashboard (Gemini & Claude limits)\'',
    '        \'list:List all vaulted profiles with inline quota bars\'',
    '        \'current:Show currently active session, storage source, and limits\'',
    '        \'save:Archive current session to vault (auto-detects email)\'',
    '        \'detach:Stash active session & clear token for clean second login\'',
    '        \'delete:Remove a profile from vault\'',
    '        \'db:Cloud Database & Team Vault Sync (setup, status, push, pull, sync)\'',
    '        \'completion:Generate shell autocompletion script (bash, zsh, fish, powershell)\'',
    '        \'uninstall:Cleanly delete and remove ag-auth from your computer\'',
    '        \'version:Show version information\'',
    '        \'help:Show help message\'',
    '    )',
    '',
    '    local -a profiles',
    '    profiles=(${(f)"$(ag-auth _profiles 2>/dev/null)"})',
    '',
    '    local -a db_cmds',
    '    db_cmds=(',
    '        \'setup:Connect Supabase, shared folder, or REST database\'',
    '        \'status:Check connection health and remote profile count\'',
    '        \'push:Encrypt and push local profiles to team vault\'',
    '        \'pull:Pull and decrypt team profiles into local vault\'',
    '        \'sync:Two-way synchronization (push local + pull remote)\'',
    '        \'auto-sync:Check or toggle continuous automatic sync\'',
    '        \'daemon:Run persistent background polling sync daemon\'',
    '        \'disconnect:Safely unlink remote database\'',
    '    )',
    '',
    '    _arguments -C \\',
    '        \'(-s --surface)\'{-s,--surface}\'[Target runtime surface]:surface:(all cli ide app)\' \\',
    '        \'(-r --refresh -f --force)\'{-r,--refresh,-f,--force}\'[Force bypass cache and fetch live data]\' \\',
    '        \'(-h --help)\'{-h,--help}\'[Show help]\' \\',
    '        \'(-v --version)\'{-v,--version}\'[Show version]\' \\',
    '        \'1: :->command\' \\',
    '        \'2: :->argument\' \\',
    '        \'*:: :->args\'',
    '',
    '    case $state in',
    '        command)',
    '            if [[ "$words[1]" == "@" ]]; then',
    '                _describe -t profiles \'Vaulted Profiles\' profiles',
    '            else',
    '                _describe -t commands \'ag-auth commands\' commands',
    '            fi',
    '            ;;',
    '        argument)',
    '            case $words[2] in',
    '                switch|quota|delete|use|rm)',
    '                    _describe -t profiles \'Vaulted Profiles\' profiles',
    '                    ;;',
    '                db)',
    '                    _describe -t db_cmds \'Database Commands\' db_cmds',
    '                    ;;',
    '                completion)',
    '                    local -a shells',
    '                    shells=(\'bash\' \'zsh\' \'fish\' \'powershell\' \'install\')',
    '                    _describe -t shells \'Shell\' shells',
    '                    ;;',
    '            esac',
    '            ;;',
    '    esac',
    '}',
    '',
    'if (( $+functions[compdef] )); then',
    '    compdef _ag_auth ag-auth',
    '    compdef _ag_auth @',
    'fi'
  ].join('\n') + '\n';
}

function getFishCompletionScript() {
  return [
    'complete -c ag-auth -f',
    'complete -c @ -f',
    '',
    'set -l commands switch quota list current save detach delete db completion uninstall version help',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "switch" -d "Switch active account"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "quota" -d "View AI quota dashboard"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "list" -d "List all vaulted profiles"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "current" -d "Show current session"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "save" -d "Save session to vault"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "detach" -d "Detach session for new login"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "delete" -d "Delete profile from vault"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "db" -d "Cloud Database & Team Sync"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "completion" -d "Shell completion generator"',
    'complete -c ag-auth -n "not __fish_seen_subcommand_from $commands" -a "uninstall" -d "Cleanly uninstall program"',
    '',
    'complete -c ag-auth -n "__fish_seen_subcommand_from switch quota delete" -a "(ag-auth _profiles 2>/dev/null)"',
    'complete -c ag-auth -n "__fish_seen_subcommand_from db" -a "setup status push pull sync auto-sync daemon disconnect"',
    'complete -c @ -a "(ag-auth _profiles 2>/dev/null)"'
  ].join('\n') + '\n';
}

function getPowerShellCompletionScript() {
  return [
    'Register-ArgumentCompleter -Native -CommandName \'ag-auth\', \'@\' -ScriptBlock {',
    '    param($wordToComplete, $commandAst, $cursorPosition)',
    '    $commands = @(\'switch\', \'quota\', \'list\', \'current\', \'save\', \'detach\', \'delete\', \'db\', \'completion\', \'uninstall\', \'version\', \'help\')',
    '    $db_cmds = @(\'setup\', \'status\', \'push\', \'pull\', \'sync\', \'auto-sync\', \'daemon\', \'disconnect\')',
    '    $profiles = @(ag-auth _profiles 2>$null)',
    '    $elements = $commandAst.Elements',
    '',
    '    if ($elements.Count -le 2) {',
    '        $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {',
    '            [System.Management.Automation.CompletionResult]::new($_, $_, \'ParameterValue\', $_)',
    '        }',
    '    } else {',
    '        $sub = $elements[1].Extent.Text',
    '        if ($sub -in @(\'switch\', \'quota\', \'delete\', \'@\')) {',
    '            $profiles | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {',
    '                [System.Management.Automation.CompletionResult]::new($_, $_, \'ParameterValue\', $_)',
    '            }',
    '        } elseif ($sub -eq \'db\') {',
    '            $db_cmds | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {',
    '                [System.Management.Automation.CompletionResult]::new($_, $_, \'ParameterValue\', $_)',
    '            }',
    '        }',
    '    }',
    '}'
  ].join('\n') + '\n';
}

function installCompletion() {
  const currentShell = path.basename(process.env.SHELL || 'bash');
  console.log(`${CYAN}Installing tab autocompletion for shell: ${BOLD}${currentShell}${NC}...`);

  if (currentShell === 'zsh') {
    const zfuncDir = path.join(HOME, '.zfunc');
    fs.mkdirSync(zfuncDir, { recursive: true });
    fs.writeFileSync(path.join(zfuncDir, '_ag-auth'), getZshCompletionScript(), 'utf8');

    const rc = path.join(HOME, '.zshrc');
    if (fs.existsSync(rc)) {
      let content = fs.readFileSync(rc, 'utf8');
      if (!content.includes('fpath=(~/.zfunc $fpath)')) {
        content += '\nfpath=(~/.zfunc $fpath)\nautoload -Uz compinit && compinit\n';
        fs.writeFileSync(rc, content, 'utf8');
      }
    }
    console.log(`${GREEN}✔ Zsh completions installed to ~/.zfunc/_ag-auth and registered in ~/.zshrc${NC}`);
    console.log(`Run: ${BOLD}source ~/.zshrc${NC} or restart your shell to activate.`);
  } else if (currentShell === 'bash') {
    const compFile = path.join(HOME, '.ag-auth-completion.bash');
    fs.writeFileSync(compFile, getBashCompletionScript(), 'utf8');

    const rc = fs.existsSync(path.join(HOME, '.bash_profile')) ? path.join(HOME, '.bash_profile') : path.join(HOME, '.bashrc');
    if (fs.existsSync(rc)) {
      let content = fs.readFileSync(rc, 'utf8');
      if (!content.includes('.ag-auth-completion.bash')) {
        content += `\n[ -f "${compFile}" ] && source "${compFile}"\n`;
        fs.writeFileSync(rc, content, 'utf8');
      }
    }
    console.log(`${GREEN}✔ Bash completions saved to ${compFile} and registered in ${rc}${NC}`);
    console.log(`Run: ${BOLD}source ${rc}${NC} or restart your shell to activate.`);
  } else if (currentShell === 'fish') {
    const fishDir = path.join(HOME, '.config', 'fish', 'completions');
    fs.mkdirSync(fishDir, { recursive: true });
    fs.writeFileSync(path.join(fishDir, 'ag-auth.fish'), getFishCompletionScript(), 'utf8');
    fs.writeFileSync(path.join(fishDir, '@.fish'), getFishCompletionScript(), 'utf8');
    console.log(`${GREEN}✔ Fish completions installed to ${fishDir}/ag-auth.fish${NC}`);
  } else {
    console.log(`${YELLOW}To configure manually, add to your shell profile:${NC}`);
    console.log('  eval "$(ag-auth completion zsh)"  # or bash / fish / powershell');
  }
}

module.exports = {
  getBashCompletionScript,
  getZshCompletionScript,
  getFishCompletionScript,
  getPowerShellCompletionScript,
  installCompletion
};

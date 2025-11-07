import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional


def ensure_dir(path: str) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def init_git_repo(repo_path: str) -> None:
    repo = Path(repo_path)
    if (repo / ".git").exists():
        # create-next-app@14 already initializes git; reuse it
        return
    subprocess.run(["git", "init"], cwd=repo_path, check=True)
    subprocess.run(["git", "add", "-A"], cwd=repo_path, check=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=repo_path, check=True)


def scaffold_nextjs_minimal(repo_path: str) -> None:
    """Scaffold a Next.js project from the built-in template (Next 13.5)."""
    from app.core.terminal_ui import ui

    target = Path(repo_path)
    ensure_dir(str(target))

    template_dir = (
        Path(__file__).resolve().parent / "templates" / "nextjs_app"
    )
    if not template_dir.exists():
        raise Exception("Starter template is missing. Please reinstall dependencies.")

    ui.info("Copying Next.js starter template", "Filesystem")
    shutil.copytree(template_dir, target, dirs_exist_ok=True)

    package_path = target / "package.json"
    try:
        package_data = json.loads(package_path.read_text())
        package_data["name"] = target.name
        package_path.write_text(json.dumps(package_data, indent=2) + "\n")
    except Exception as exc:
        ui.warning(f"Failed to personalize package.json: {exc}", "Filesystem")


def write_env_file(project_dir: str, content: str) -> None:
    (Path(project_dir) / ".env").write_text(content)

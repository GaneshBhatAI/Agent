import base64
import logging
from typing import Any, Dict, List, Optional
import httpx
from app.config import settings
from app.schemas.repository import (
    GitHubBranchItem,
    GitHubCommitItem,
    GitHubFileItem,
    GitHubRepoItem,
)

logger = logging.getLogger(__name__)

# Mock repositories provided out-of-the-box for demo & local offline exploration
MOCK_REPOSITORIES = [
    {
        "name": "hello-bot",
        "full_name": "orchestrator-demo/hello-bot",
        "owner": "orchestrator-demo",
        "html_url": "https://github.com/orchestrator-demo/hello-bot",
        "description": "Simple demonstration bot printing greeting message and machine details",
        "default_branch": "main",
        "private": False,
        "language": "Python",
        "updated_at": "2026-08-14T10:00:00Z",
        "branches": [
            {"name": "main", "commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678", "protected": True},
            {"name": "development", "commit_sha": "f0e1d2c3b4a59687786950413241526374859607", "protected": False},
        ],
        "files": {
            "main": [
                {"name": "main.py", "path": "main.py", "type": "file", "is_python": True, "size": 340},
                {"name": "requirements.txt", "path": "requirements.txt", "type": "file", "is_dependency_file": True, "size": 45},
                {"name": "README.md", "path": "README.md", "type": "file", "size": 512},
            ]
        },
        "file_contents": {
            "main.py": 'import sys\nimport os\n\nprint("Hello from Python Orchestrator Agent!")\nprint(f"Executing on Python {sys.version}")\nprint(f"Working Directory: {os.getcwd()}")\nif len(sys.argv) > 1:\n    print(f"Received arguments: {sys.argv[1:]}")\n',
            "requirements.txt": "requests>=2.31.0\npsutil>=5.9.8\n",
        },
        "commits": [
            {
                "sha": "a1b2c3d4e5f67890123456789abcdef012345678",
                "message": "feat: initialize hello-bot script and dependencies",
                "author": "Orchestrator Admin",
                "date": "2026-08-14T09:30:00Z",
            }
        ],
    },
    {
        "name": "invoice-automation",
        "full_name": "orchestrator-demo/invoice-automation",
        "owner": "orchestrator-demo",
        "html_url": "https://github.com/orchestrator-demo/invoice-automation",
        "description": "Enterprise invoice reconciliation and automated PDF extraction bot",
        "default_branch": "main",
        "private": True,
        "language": "Python",
        "updated_at": "2026-08-14T11:20:00Z",
        "branches": [
            {"name": "main", "commit_sha": "9e8d7c6b5a43210fe9dcba876543210fedcba987", "protected": True},
            {"name": "feature/ocr-v2", "commit_sha": "123456789abcdef0123456789abcdef012345678", "protected": False},
        ],
        "files": {
            "main": [
                {"name": "main.py", "path": "main.py", "type": "file", "is_python": True, "size": 1200},
                {"name": "processor.py", "path": "processor.py", "type": "file", "is_python": True, "size": 2400},
                {"name": "config.yaml", "path": "config.yaml", "type": "file", "size": 350},
                {"name": "requirements.txt", "path": "requirements.txt", "type": "file", "is_dependency_file": True, "size": 120},
                {"name": "README.md", "path": "README.md", "type": "file", "size": 890},
            ]
        },
        "file_contents": {
            "main.py": 'import time\nimport sys\n\nprint("[1/5] Initializing Invoice Automation Bot...")\ntime.sleep(1)\nprint("[2/5] Loading configuration and vendor templates...")\ntime.sleep(1)\nprint("[3/5] Connecting to staging invoice feed...")\ntime.sleep(1)\nprint("[4/5] Successfully processed 14 invoices without discrepancy.")\ntime.sleep(1)\nprint("[5/5] Invoice reconciliation complete. Exit code 0.")\n',
            "requirements.txt": "pydantic>=2.0.0\nrequests>=2.31.0\n",
        },
        "commits": [
            {
                "sha": "9e8d7c6b5a43210fe9dcba876543210fedcba987",
                "message": "fix: improve PDF regex extraction robustness",
                "author": "Sarah Chen",
                "date": "2026-08-14T11:15:00Z",
            }
        ],
    },
    {
        "name": "report-generator",
        "full_name": "orchestrator-demo/report-generator",
        "owner": "orchestrator-demo",
        "html_url": "https://github.com/orchestrator-demo/report-generator",
        "description": "Automated executive KPI digest and scheduled analytics reporter",
        "default_branch": "main",
        "private": False,
        "language": "Python",
        "updated_at": "2026-08-14T08:15:00Z",
        "branches": [
            {"name": "main", "commit_sha": "3456789abcdef0123456789abcdef0123456789a", "protected": True},
        ],
        "files": {
            "main": [
                {"name": "main.py", "path": "main.py", "type": "file", "is_python": True, "size": 950},
                {"name": "charts.py", "path": "charts.py", "type": "file", "is_python": True, "size": 1800},
                {"name": "pyproject.toml", "path": "pyproject.toml", "type": "file", "is_dependency_file": True, "size": 600},
                {"name": "README.md", "path": "README.md", "type": "file", "size": 420},
            ]
        },
        "file_contents": {
            "main.py": 'import datetime\nprint(f"Executive Daily Report generated on {datetime.datetime.now()}")\nprint("Metrics: Active Agents: 5 | Completed Jobs: 120 | Uptime: 99.98%")\n',
            "pyproject.toml": '[build-system]\nrequires = ["setuptools>=61.0"]\nbuild-backend = "setuptools.build_meta"\n',
        },
        "commits": [
            {
                "sha": "3456789abcdef0123456789abcdef0123456789a",
                "message": "feat: add daily revenue trend aggregation",
                "author": "David Miller",
                "date": "2026-08-14T08:10:00Z",
            }
        ],
    },
]


class GitHubService:
    BASE_URL = "https://api.github.com"

    def _get_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        auth_token = token or settings.GITHUB_TOKEN
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Python-GitHub-Orchestrator/1.0",
        }
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        return headers

    async def list_repositories(self, token: Optional[str] = None) -> List[GitHubRepoItem]:
        """Fetch repositories from GitHub or fallback to demo repositories"""
        auth_token = token or settings.GITHUB_TOKEN
        if auth_token:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{self.BASE_URL}/user/repos?sort=updated&per_page=50",
                        headers=self._get_headers(auth_token),
                    )
                    if resp.status_code == 200:
                        repos = resp.json()
                        return [
                            GitHubRepoItem(
                                name=r["name"],
                                full_name=r["full_name"],
                                owner=r["owner"]["login"],
                                html_url=r["html_url"],
                                description=r.get("description"),
                                default_branch=r.get("default_branch", "main"),
                                private=r.get("private", False),
                                language=r.get("language"),
                                updated_at=r.get("updated_at"),
                            )
                            for r in repos
                        ]
                    else:
                        logger.warning(f"GitHub API returned {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"Failed to fetch repositories from GitHub API: {e}")

        # Return curated mock repositories if no token or API call failed
        return [
            GitHubRepoItem(
                name=r["name"],
                full_name=r["full_name"],
                owner=r["owner"],
                html_url=r["html_url"],
                description=r["description"],
                default_branch=r["default_branch"],
                private=r["private"],
                language=r["language"],
                updated_at=r["updated_at"],
            )
            for r in MOCK_REPOSITORIES
        ]

    async def list_branches(
        self, owner: str, repo: str, token: Optional[str] = None
    ) -> List[GitHubBranchItem]:
        """Fetch repository branches"""
        auth_token = token or settings.GITHUB_TOKEN
        if auth_token and owner != "orchestrator-demo":
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{self.BASE_URL}/repos/{owner}/{repo}/branches",
                        headers=self._get_headers(auth_token),
                    )
                    if resp.status_code == 200:
                        branches = resp.json()
                        return [
                            GitHubBranchItem(
                                name=b["name"],
                                commit_sha=b["commit"]["sha"],
                                protected=b.get("protected", False),
                            )
                            for b in branches
                        ]
            except Exception as e:
                logger.error(f"Failed to fetch branches from GitHub API: {e}")

        # Check mock repos
        for mock_repo in MOCK_REPOSITORIES:
            if mock_repo["name"] == repo or mock_repo["full_name"] == f"{owner}/{repo}":
                return [
                    GitHubBranchItem(
                        name=b["name"],
                        commit_sha=b["commit_sha"],
                        protected=b["protected"],
                    )
                    for b in mock_repo["branches"]
                ]

        return [
            GitHubBranchItem(name="main", commit_sha="a1b2c3d4e5f67890123456789abcdef012345678", protected=True)
        ]

    async def list_files(
        self, owner: str, repo: str, branch: str = "main", path: str = "", token: Optional[str] = None
    ) -> List[GitHubFileItem]:
        """Fetch repository directory files, flagging Python entry points and dependency files"""
        auth_token = token or settings.GITHUB_TOKEN
        if auth_token and owner != "orchestrator-demo":
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    clean_path = path.strip("/")
                    url = f"{self.BASE_URL}/repos/{owner}/{repo}/contents/{clean_path}?ref={branch}"
                    resp = await client.get(url, headers=self._get_headers(auth_token))
                    if resp.status_code == 200:
                        contents = resp.json()
                        if isinstance(contents, list):
                            items = []
                            for item in contents:
                                name = item["name"]
                                is_python = name.endswith(".py")
                                is_dep = name in ["requirements.txt", "pyproject.toml", "Pipfile", "setup.py"]
                                items.append(
                                    GitHubFileItem(
                                        name=name,
                                        path=item["path"],
                                        type=item["type"],
                                        size=item.get("size"),
                                        is_python=is_python,
                                        is_dependency_file=is_dep,
                                    )
                                )
                            return items
            except Exception as e:
                logger.error(f"Failed to fetch files from GitHub API: {e}")

        # Check mock repos
        for mock_repo in MOCK_REPOSITORIES:
            if mock_repo["name"] == repo or mock_repo["full_name"] == f"{owner}/{repo}":
                files = mock_repo["files"].get(branch, mock_repo["files"].get("main", []))
                return [
                    GitHubFileItem(
                        name=f["name"],
                        path=f["path"],
                        type=f.get("type", "file"),
                        size=f.get("size", 100),
                        is_python=f.get("is_python", f["name"].endswith(".py")),
                        is_dependency_file=f.get("is_dependency_file", f["name"] in ["requirements.txt", "pyproject.toml"]),
                    )
                    for f in files
                ]

        # Default fallback
        return [
            GitHubFileItem(name="main.py", path="main.py", type="file", size=200, is_python=True),
            GitHubFileItem(name="requirements.txt", path="requirements.txt", type="file", size=50, is_dependency_file=True),
        ]

    async def get_latest_commit(
        self, owner: str, repo: str, branch: str = "main", token: Optional[str] = None
    ) -> GitHubCommitItem:
        """Resolve latest commit SHA for a branch"""
        auth_token = token or settings.GITHUB_TOKEN
        if auth_token and owner != "orchestrator-demo":
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{self.BASE_URL}/repos/{owner}/{repo}/commits/{branch}",
                        headers=self._get_headers(auth_token),
                    )
                    if resp.status_code == 200:
                        c = resp.json()
                        return GitHubCommitItem(
                            sha=c["sha"],
                            message=c["commit"]["message"],
                            author=c["commit"]["author"]["name"],
                            date=c["commit"]["author"]["date"],
                            url=c.get("html_url"),
                        )
            except Exception as e:
                logger.error(f"Failed to fetch commit from GitHub API: {e}")

        # Mock fallback
        for mock_repo in MOCK_REPOSITORIES:
            if mock_repo["name"] == repo or mock_repo["full_name"] == f"{owner}/{repo}":
                c = mock_repo["commits"][0]
                return GitHubCommitItem(
                    sha=c["sha"],
                    message=c["message"],
                    author=c["author"],
                    date=c["date"],
                )

        return GitHubCommitItem(
            sha="a1b2c3d4e5f67890123456789abcdef012345678",
            message="Initial commit",
            author="System",
            date="2026-08-14T00:00:00Z",
        )

    async def get_commits(
        self, owner: str, repo: str, branch: str = "main", token: Optional[str] = None
    ) -> List[GitHubCommitItem]:
        """Fetch recent commit history"""
        auth_token = token or settings.GITHUB_TOKEN
        if auth_token and owner != "orchestrator-demo":
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{self.BASE_URL}/repos/{owner}/{repo}/commits?sha={branch}&per_page=20",
                        headers=self._get_headers(auth_token),
                    )
                    if resp.status_code == 200:
                        commits = resp.json()
                        return [
                            GitHubCommitItem(
                                sha=c["sha"],
                                message=c["commit"]["message"],
                                author=c["commit"]["author"]["name"],
                                date=c["commit"]["author"]["date"],
                                url=c.get("html_url"),
                            )
                            for c in commits
                        ]
            except Exception as e:
                logger.error(f"Failed to fetch commits from GitHub API: {e}")

        # Mock fallback
        for mock_repo in MOCK_REPOSITORIES:
            if mock_repo["name"] == repo or mock_repo["full_name"] == f"{owner}/{repo}":
                return [
                    GitHubCommitItem(
                        sha=c["sha"],
                        message=c["message"],
                        author=c["author"],
                        date=c["date"],
                    )
                    for c in mock_repo["commits"]
                ]

        return [
            GitHubCommitItem(
                sha="a1b2c3d4e5f67890123456789abcdef012345678",
                message="Initial commit",
                author="System",
                date="2026-08-14T00:00:00Z",
            )
        ]


github_service = GitHubService()

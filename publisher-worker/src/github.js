import { PublisherError } from "./domain.js";

const API_ROOT = "https://api.github.com";

class GitHubApiError extends Error {
  constructor(status) {
    super("GitHub API request failed");
    this.name = "GitHubApiError";
    this.status = status;
  }
}

function encodePath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function apiHeaders(token, additional = {}) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "BlogLim-Secure-Publisher",
    ...additional,
  };
}

async function requestJson(fetchImpl, token, path, options = {}) {
  const response = await fetchImpl(API_ROOT + path, {
    ...options,
    headers: apiHeaders(token, options.headers),
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function asPublisherError(error) {
  if (error instanceof PublisherError) {
    return error;
  }
  if (error instanceof GitHubApiError && error.status === 401) {
    return new PublisherError("AUTH_REQUIRED", "GitHub 로그인이 만료됐습니다.", 401);
  }
  return new PublisherError("GITHUB_ERROR", "GitHub에 커밋하지 못했습니다.", 502);
}

async function getBase(fetchImpl, token, repositoryPath, branch) {
  const reference = await requestJson(fetchImpl, token, repositoryPath + "/git/ref/heads/" + encodeURIComponent(branch));
  const commit = await requestJson(fetchImpl, token, repositoryPath + "/git/commits/" + encodeURIComponent(reference.object.sha));
  return { commitSha: reference.object.sha, treeSha: commit.tree.sha };
}

async function assertPathsAvailable(fetchImpl, token, repositoryPath, branch, paths) {
  for (const path of paths) {
    const response = await fetchImpl(
      API_ROOT + repositoryPath + "/contents/" + encodePath(path) + "?ref=" + encodeURIComponent(branch),
      { headers: apiHeaders(token) }
    );

    if (response.status === 404) {
      continue;
    }
    if (response.ok) {
      throw new PublisherError("PATH_CONFLICT", "같은 경로의 글 또는 이미지가 이미 있습니다.", 409);
    }
    throw new GitHubApiError(response.status);
  }
}

async function createBlob(fetchImpl, token, repositoryPath, content, encoding) {
  const blob = await requestJson(fetchImpl, token, repositoryPath + "/git/blobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, encoding }),
  });
  return blob.sha;
}

async function createTree(fetchImpl, token, repositoryPath, baseTreeSha, entries) {
  const tree = await requestJson(fetchImpl, token, repositoryPath + "/git/trees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
  });
  return tree.sha;
}

async function createCommit(fetchImpl, token, repositoryPath, title, treeSha, parentSha) {
  const commit = await requestJson(fetchImpl, token, repositoryPath + "/git/commits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Publish: " + title,
      tree: treeSha,
      parents: [parentSha],
    }),
  });
  return commit.sha;
}

async function updateReference(fetchImpl, token, repositoryPath, branch, commitSha) {
  return fetchImpl(API_ROOT + repositoryPath + "/git/refs/heads/" + encodeURIComponent(branch), {
    method: "PATCH",
    headers: apiHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ sha: commitSha, force: false }),
  });
}

export async function publishAtomic({ fetchImpl = fetch, token, owner, repo, branch, publication }) {
  const repositoryPath = "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo);
  const paths = [publication.postPath].concat(publication.images.map((image) => image.path));

  try {
    let base = await getBase(fetchImpl, token, repositoryPath, branch);
    await assertPathsAvailable(fetchImpl, token, repositoryPath, branch, paths);

    const postBlobSha = await createBlob(fetchImpl, token, repositoryPath, publication.markdown, "utf-8");
    const imageBlobShas = await Promise.all(
      publication.images.map((image) => createBlob(fetchImpl, token, repositoryPath, image.dataBase64, "base64"))
    );
    const entries = [
      { path: publication.postPath, mode: "100644", type: "blob", sha: postBlobSha },
      ...publication.images.map((image, index) => ({
        path: image.path,
        mode: "100644",
        type: "blob",
        sha: imageBlobShas[index],
      })),
    ];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt > 0) {
        base = await getBase(fetchImpl, token, repositoryPath, branch);
        await assertPathsAvailable(fetchImpl, token, repositoryPath, branch, paths);
      }

      const treeSha = await createTree(fetchImpl, token, repositoryPath, base.treeSha, entries);
      const commitSha = await createCommit(fetchImpl, token, repositoryPath, publication.title, treeSha, base.commitSha);
      const response = await updateReference(fetchImpl, token, repositoryPath, branch, commitSha);

      if (response.ok) {
        return {
          commitSha,
          commitUrl: "https://github.com/" + owner + "/" + repo + "/commit/" + commitSha,
        };
      }
      if (response.status !== 409 && response.status !== 422) {
        throw new GitHubApiError(response.status);
      }
    }

    throw new PublisherError("BRANCH_CONFLICT", "main 브랜치가 동시에 변경됐습니다.", 409);
  } catch (error) {
    throw asPublisherError(error);
  }
}

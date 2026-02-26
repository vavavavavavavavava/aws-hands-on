const { Amplify, Auth } = window.aws_amplify;

if (!window.awsConfig) {
  throw new Error("aws-exports.js が読み込まれていません");
}

Amplify.configure(window.awsConfig);

const authStatus = document.getElementById("authStatus");
const postList = document.getElementById("postList");

const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const codeEl = document.getElementById("code");
const titleEl = document.getElementById("title");
const contentEl = document.getElementById("content");

const api = {
  async token() {
    const session = await Auth.currentSession();
    return session.getIdToken().getJwtToken();
  },

  async getPosts() {
    const token = await this.token();
    const res = await fetch(`${window.awsConfig.apiBaseUrl}/posts`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error(`getPosts failed: ${res.status}`);
    return res.json();
  },

  async createPost(payload) {
    const token = await this.token();
    const res = await fetch(`${window.awsConfig.apiBaseUrl}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`createPost failed: ${res.status}`);
    return res.json();
  },

  async deletePost(postId) {
    const token = await this.token();
    const res = await fetch(`${window.awsConfig.apiBaseUrl}/posts/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error(`deletePost failed: ${res.status}`);
    return res.json();
  }
};

const setStatus = (message) => {
  authStatus.textContent = message;
};

const escapeHtml = (str) =>
  str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

async function refreshPosts() {
  try {
    const data = await api.getPosts();
    const items = data.items || [];

    if (items.length === 0) {
      postList.innerHTML = "<li>投稿はまだありません。</li>";
      return;
    }

    postList.innerHTML = items
      .map(
        (item) => `
      <li>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.content)}</p>
        <p class="meta">${escapeHtml(item.authorName)} / ${escapeHtml(item.createdAt)}</p>
        <button data-post-id="${escapeHtml(item.postId)}" class="delete-btn">削除</button>
      </li>
    `
      )
      .join("");

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const postId = btn.getAttribute("data-post-id");
        if (!postId) return;

        try {
          await api.deletePost(postId);
          await refreshPosts();
        } catch (e) {
          setStatus(`削除失敗: ${e.message}`);
        }
      });
    });
  } catch (e) {
    setStatus(`投稿取得失敗: ${e.message}`);
  }
}

document.getElementById("signupBtn").addEventListener("click", async () => {
  try {
    await Auth.signUp({
      username: emailEl.value,
      password: passwordEl.value,
      attributes: {
        email: emailEl.value
      }
    });
    setStatus("サインアップ完了。確認コードを入力してください。");
  } catch (e) {
    setStatus(`サインアップ失敗: ${e.message}`);
  }
});

document.getElementById("confirmBtn").addEventListener("click", async () => {
  try {
    await Auth.confirmSignUp(emailEl.value, codeEl.value);
    setStatus("登録確認が完了しました。ログインしてください。");
  } catch (e) {
    setStatus(`登録確認失敗: ${e.message}`);
  }
});

document.getElementById("signinBtn").addEventListener("click", async () => {
  try {
    await Auth.signIn(emailEl.value, passwordEl.value);
    setStatus("ログインしました。");
    await refreshPosts();
  } catch (e) {
    setStatus(`ログイン失敗: ${e.message}`);
  }
});

document.getElementById("signoutBtn").addEventListener("click", async () => {
  try {
    await Auth.signOut();
    setStatus("ログアウトしました。");
    postList.innerHTML = "";
  } catch (e) {
    setStatus(`ログアウト失敗: ${e.message}`);
  }
});

document.getElementById("createBtn").addEventListener("click", async () => {
  try {
    await api.createPost({
      boardId: "main",
      title: titleEl.value,
      content: contentEl.value
    });
    titleEl.value = "";
    contentEl.value = "";
    setStatus("投稿しました。");
    await refreshPosts();
  } catch (e) {
    setStatus(`投稿失敗: ${e.message}`);
  }
});

document.getElementById("reloadBtn").addEventListener("click", refreshPosts);

(async () => {
  try {
    await Auth.currentAuthenticatedUser();
    setStatus("ログイン済みです。");
    await refreshPosts();
  } catch {
    setStatus("未ログインです。");
  }
})();

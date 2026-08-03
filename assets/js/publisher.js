(function () {
  "use strict";

  var SESSION_KEY = "bloglim-publisher-session";
  var MAX_IMAGES = 5;
  var MAX_IMAGE_BYTES = 3 * 1024 * 1024;
  var MAX_TOTAL_IMAGE_BYTES = 10 * 1024 * 1024;

  function setupPublisher() {
    var writer = document.querySelector("[data-markdown-writer]");

    if (!writer) {
      return;
    }

    var apiUrl = String(writer.getAttribute("data-publisher-api-url") || "").replace(/\/$/, "");
    var apiUrlIsSecure = false;
    try {
      apiUrlIsSecure = new URL(apiUrl).protocol === "https:";
    } catch (error) {
      apiUrlIsSecure = false;
    }
    var siteUrl = String(writer.getAttribute("data-site-url") || window.location.origin).replace(/\/$/, "");
    var publishButton = writer.querySelector("[data-writer-publish]");
    var logoutButton = writer.querySelector("[data-writer-logout]");
    var dialog = writer.querySelector("[data-writer-publish-dialog]");
    var confirmButton = writer.querySelector("[data-writer-publish-confirm]");
    var cancelButtons = Array.prototype.slice.call(writer.querySelectorAll("[data-writer-publish-cancel]"));
    var dialogError = writer.querySelector("[data-publish-dialog-error]");
    var status = writer.querySelector("[data-writer-status]");
    var titleInput = writer.querySelector("[data-writer-title]");
    var descriptionInput = writer.querySelector("[data-writer-description]");
    var categorySelect = writer.querySelector("[data-writer-category]");
    var customCategoryInput = writer.querySelector("[data-writer-custom-category]");
    var tagsInput = writer.querySelector("[data-writer-tags]");
    var thumbnailInput = writer.querySelector("[data-writer-thumbnail]");
    var bodyInput = writer.querySelector("[data-writer-body]");
    var pendingPayload = null;
    var busy = false;

    function setStatus(message) {
      if (!status) {
        return;
      }

      status.textContent = message;
    }

    function setDialogError(message) {
      if (!dialogError) {
        return;
      }

      dialogError.textContent = message || "";
      dialogError.hidden = !message;
    }

    function readSession() {
      try {
        return window.sessionStorage.getItem(SESSION_KEY) || "";
      } catch (error) {
        return "";
      }
    }

    function writeSession(value) {
      try {
        if (value) {
          window.sessionStorage.setItem(SESSION_KEY, value);
        } else {
          window.sessionStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        setStatus("브라우저 세션 저장소를 사용할 수 없습니다.");
      }

      if (logoutButton) {
        logoutButton.hidden = !value;
      }
    }

    function slugify(value) {
      var normalized = String(value || "")
        .normalize("NFC")
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      return Array.from(normalized || "new-post").slice(0, 80).join("");
    }

    function getSeoulDate() {
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      var values = {};

      parts.forEach(function (part) {
        values[part.type] = part.value;
      });

      return values.year + "-" + values.month + "-" + values.day;
    }

    function splitValues(value, separator) {
      return String(value || "")
        .split(separator)
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean);
    }

    function estimateBase64Bytes(value) {
      var normalized = String(value || "").replace(/\s/g, "");
      var padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;

      return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
    }

    function extractImages(markdown) {
      var images = [];
      var totalBytes = 0;
      var pattern = /!\[([^\]]*)\]\((data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=\s]+))\)/gi;
      var body = String(markdown || "").replace(pattern, function (_match, alt, _dataUrl, mimeType, dataBase64) {
        var normalizedBase64 = String(dataBase64 || "").replace(/\s/g, "");
        var byteLength = estimateBase64Bytes(normalizedBase64);
        var id = "image-" + String(images.length + 1);

        if (byteLength > MAX_IMAGE_BYTES) {
          throw new Error("이미지 한 개는 3MB 이하여야 합니다.");
        }

        totalBytes += byteLength;
        images.push({
          id: id,
          alt: String(alt || "image").slice(0, 200),
          mimeType: String(mimeType || "").toLowerCase(),
          dataBase64: normalizedBase64,
        });

        return "![" + alt + "](bloglim-image://" + id + ")";
      });

      if (images.length > MAX_IMAGES) {
        throw new Error("한 글에는 이미지를 최대 5개까지 게시할 수 있습니다.");
      }

      if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
        throw new Error("이미지 전체 용량은 10MB 이하여야 합니다.");
      }

      if (/data:image\//i.test(body)) {
        throw new Error("지원하지 않는 이미지 형식이 있습니다. JPEG, PNG, GIF, WebP만 사용할 수 있습니다.");
      }

      return { body: body, images: images };
    }

    function collectPayload() {
      var title = String(titleInput ? titleInput.value : "").trim();
      var rawBody = String(bodyInput ? bodyInput.value : "").trim();
      var firstHeading = rawBody.match(/^#\s+(.+)$/m);

      if (!title && firstHeading) {
        title = firstHeading[1].trim();
        if (titleInput) {
          titleInput.value = title;
        }
      }

      if (!title) {
        throw new Error("게시할 글의 제목을 입력해 주세요.");
      }

      if (!rawBody) {
        throw new Error("게시할 본문을 입력해 주세요.");
      }

      var extracted = extractImages(rawBody);
      var selectedCategory = String(customCategoryInput && customCategoryInput.value.trim() || categorySelect && categorySelect.value.trim() || "");

      return {
        title: title,
        description: String(descriptionInput ? descriptionInput.value : "").trim(),
        slug: slugify(title),
        categories: splitValues(selectedCategory, "/"),
        tags: splitValues(tagsInput ? tagsInput.value : "", ","),
        thumbnail: String(thumbnailInput ? thumbnailInput.value : "").trim(),
        body: extracted.body,
        images: extracted.images,
      };
    }

    function setSummary(selector, value) {
      var element = dialog ? dialog.querySelector(selector) : null;
      if (element) {
        element.textContent = value;
      }
    }

    function openDialog(payload) {
      var date = getSeoulDate();
      var publicUrl = siteUrl + "/" + encodeURIComponent(payload.slug) + "/";

      setDialogError("");
      setSummary("[data-publish-summary-title]", payload.title);
      setSummary("[data-publish-summary-path]", "_posts/" + date + "-" + payload.slug + ".md");
      setSummary("[data-publish-summary-images]", payload.images.length + "개");
      setSummary("[data-publish-summary-url]", publicUrl);

      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
      } else if (dialog) {
        dialog.setAttribute("open", "open");
      }
    }

    function closeDialog() {
      if (!dialog) {
        return;
      }

      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }

    function errorMessage(code, fallback) {
      var messages = {
        AUTH_REQUIRED: "GitHub 로그인이 필요합니다.",
        FORBIDDEN_USER: "LimJaeHwan-real 계정만 게시할 수 있습니다.",
        INVALID_ORIGIN: "허용되지 않은 페이지에서 보낸 요청입니다.",
        INVALID_INPUT: "게시할 글의 입력값을 확인해 주세요.",
        SECRET_DETECTED: "본문에서 공개하면 안 되는 비밀값이 발견됐습니다.",
        IMAGE_INVALID: "이미지 형식 또는 용량을 확인해 주세요.",
        PATH_CONFLICT: "같은 날짜와 제목의 글이 이미 있습니다. 제목을 변경해 주세요.",
        BRANCH_CONFLICT: "main 브랜치가 동시에 변경됐습니다. 잠시 후 다시 시도해 주세요.",
        GITHUB_ERROR: "GitHub에 커밋하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        CONFIGURATION_ERROR: "게시 서버 설정이 아직 완료되지 않았습니다.",
      };

      return messages[code] || fallback || "게시 중 오류가 발생했습니다.";
    }

    function authenticate() {
      return new Promise(function (resolve, reject) {
        var apiOrigin;
        try {
          apiOrigin = new URL(apiUrl).origin;
        } catch (error) {
          reject(new Error("게시 서버 주소가 올바르지 않습니다."));
          return;
        }

        var popup = window.open(
          apiUrl + "/auth/start?return_origin=" + encodeURIComponent(window.location.origin),
          "bloglim-github-auth",
          "popup=yes,width=620,height=760"
        );

        if (!popup) {
          reject(new Error("GitHub 로그인 팝업이 차단됐습니다. 팝업을 허용해 주세요."));
          return;
        }

        var timeout = window.setTimeout(function () {
          finish();
          if (!popup.closed) {
            popup.close();
          }
          reject(new Error("GitHub 로그인 시간이 만료됐습니다."));
        }, 5 * 60 * 1000);
        var popupCloseTimer = window.setInterval(function () {
          if (popup.closed) {
            finish();
            reject(new Error("GitHub 로그인 창이 닫혔습니다."));
          }
        }, 500);

        function finish() {
          window.clearTimeout(timeout);
          window.clearInterval(popupCloseTimer);
          window.removeEventListener("message", onMessage);
        }

        function onMessage(event) {
          if (event.origin !== apiOrigin || !event.data) {
            return;
          }

          if (event.data.type === "bloglim:auth" && typeof event.data.session === "string") {
            finish();
            writeSession(event.data.session);
            resolve(event.data.session);
          } else if (event.data.type === "bloglim:auth-error") {
            finish();
            reject(new Error(errorMessage(event.data.code, "GitHub 로그인에 실패했습니다.")));
          }
        }

        window.addEventListener("message", onMessage);
      });
    }

    function requestPublish(payload, session) {
      return window.fetch(apiUrl + "/publish", {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: {
          Authorization: "Bearer " + session,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (data) {
          if (!response.ok) {
            var error = new Error(errorMessage(data && data.error && data.error.code, data && data.error && data.error.message));
            error.code = data && data.error && data.error.code;
            throw error;
          }
          return data;
        });
      });
    }

    function publish(payload) {
      var session = readSession();
      var sessionPromise = session ? Promise.resolve(session) : authenticate();

      return sessionPromise.then(function (activeSession) {
        return requestPublish(payload, activeSession).catch(function (error) {
          if (error.code !== "AUTH_REQUIRED") {
            throw error;
          }

          writeSession("");
          return authenticate().then(function (newSession) {
            return requestPublish(payload, newSession);
          });
        });
      });
    }

    function showPublished(result) {
      if (!status) {
        return;
      }

      status.textContent = "게시 커밋이 완료됐습니다. ";
      var commitLink = document.createElement("a");
      commitLink.href = result.commitUrl;
      commitLink.target = "_blank";
      commitLink.rel = "noopener noreferrer";
      commitLink.textContent = "커밋 보기";
      status.appendChild(commitLink);
      status.appendChild(document.createTextNode(" · "));
      var postLink = document.createElement("a");
      postLink.href = result.publicUrl;
      postLink.target = "_blank";
      postLink.rel = "noopener noreferrer";
      postLink.textContent = "배포 확인 중";
      status.appendChild(postLink);

      var attempts = 0;
      function checkDeployment() {
        attempts += 1;
        window.fetch(result.publicUrl, { cache: "no-store" })
          .then(function (response) {
            if (response.ok) {
              postLink.textContent = "게시된 글 보기";
              return;
            }
            throw new Error("not ready");
          })
          .catch(function () {
            if (attempts < 23) {
              window.setTimeout(checkDeployment, 8000);
            } else {
              postLink.textContent = "배포 상태 확인";
            }
          });
      }

      window.setTimeout(checkDeployment, 8000);
    }

    function setBusy(nextBusy) {
      busy = nextBusy;
      if (publishButton) {
        publishButton.disabled = nextBusy || !apiUrlIsSecure;
      }
      if (confirmButton) {
        confirmButton.disabled = nextBusy;
        confirmButton.textContent = nextBusy ? "게시 중…" : "확인하고 게시";
      }
    }

    if (publishButton) {
      publishButton.addEventListener("click", function () {
        if (busy) {
          return;
        }

        try {
          pendingPayload = collectPayload();
          openDialog(pendingPayload);
        } catch (error) {
          setStatus(error.message);
        }
      });
    }

    if (confirmButton) {
      confirmButton.addEventListener("click", function () {
        if (busy || !pendingPayload) {
          return;
        }

        setDialogError("");
        setBusy(true);
        setStatus("GitHub 인증과 게시를 진행하고 있습니다…");

        publish(pendingPayload)
          .then(function (result) {
            closeDialog();
            showPublished(result);
          })
          .catch(function (error) {
            setDialogError(error.message);
            setStatus(error.message);
          })
          .finally(function () {
            setBusy(false);
          });
      });
    }

    cancelButtons.forEach(function (button) {
      button.addEventListener("click", closeDialog);
    });

    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        var session = readSession();
        writeSession("");

        if (!session || !apiUrl) {
          setStatus("GitHub 연결을 해제했습니다.");
          return;
        }

        window.fetch(apiUrl + "/logout", {
          method: "POST",
          mode: "cors",
          cache: "no-store",
          headers: { Authorization: "Bearer " + session },
        }).finally(function () {
          setStatus("GitHub 연결을 해제했습니다.");
        });
      });
    }

    writeSession(readSession());
    if (!apiUrlIsSecure) {
      setBusy(false);
      if (publishButton) {
        publishButton.title = "HTTPS Cloudflare Worker 주소를 _config.yml에 설정해야 합니다.";
      }
      setStatus("GitHub 게시 서버 설정이 필요합니다. 로컬 마크다운 저장은 계속 사용할 수 있습니다.");
    }
  }

  document.addEventListener("DOMContentLoaded", setupPublisher);
})();

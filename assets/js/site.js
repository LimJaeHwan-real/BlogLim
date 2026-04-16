(function () {
  var THEME_STORAGE_KEY = "velog-theme";
  var DEFAULT_PAGE_SIZE = 12;

  function getStoredTheme() {
    try {
      var storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      return storedTheme === "dark" || storedTheme === "light" ? storedTheme : "";
    } catch (error) {
      return "";
    }
  }

  function updateThemeMeta(theme) {
    var themeColorMeta = document.querySelector("[data-theme-color]");
    var appleStatusMeta = document.querySelector("[data-apple-status-bar]");
    var safeTheme = theme === "dark" ? "dark" : "light";

    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", safeTheme === "dark" ? "#121212" : "#ffffff");
    }

    if (appleStatusMeta) {
      appleStatusMeta.setAttribute("content", safeTheme === "dark" ? "black" : "default");
    }
  }

  function getGiscusTheme(theme) {
    var container = document.querySelector("[data-comments-provider='giscus']");
    var safeTheme = theme === "dark" ? "dark" : "light";

    if (!container) {
      return "";
    }

    return container.getAttribute(safeTheme === "dark" ? "data-giscus-theme-dark" : "data-giscus-theme-light") || "";
  }

  function syncGiscusTheme(theme) {
    var iframe = document.querySelector("iframe.giscus-frame");
    var nextTheme = getGiscusTheme(theme || document.documentElement.getAttribute("data-theme"));

    if (!iframe || !iframe.contentWindow || !nextTheme) {
      return;
    }

    if (!iframe.src || iframe.src.indexOf("https://giscus.app") !== 0) {
      return;
    }

    if (iframe.getAttribute("data-theme-sync-ready") !== "true") {
      return;
    }

    iframe.contentWindow.postMessage(
      {
        giscus: {
          setConfig: {
            theme: nextTheme,
          },
        },
      },
      "https://giscus.app"
    );
  }

  function bindGiscusFrame(iframe) {
    if (!iframe || iframe.getAttribute("data-theme-sync-bound") === "true") {
      return;
    }

    iframe.setAttribute("data-theme-sync-bound", "true");
    iframe.addEventListener("load", function () {
      iframe.setAttribute("data-theme-sync-ready", "true");
      syncGiscusTheme(document.documentElement.getAttribute("data-theme"));
    });
  }

  function applyTheme(theme, persist) {
    var safeTheme = theme === "dark" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", safeTheme);
    updateThemeMeta(safeTheme);
    syncGiscusTheme(safeTheme);

    if (persist !== true) {
      return;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
    } catch (error) {
      return;
    }
  }

  function setTheme(theme) {
    applyTheme(theme, true);
  }

  function normalizeValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function updateUrl(state) {
    var nextUrl = new URL(window.location.href);

    if (state.tag) {
      nextUrl.searchParams.set("tag", state.tag);
    } else {
      nextUrl.searchParams.delete("tag");
    }

    if (state.series) {
      nextUrl.searchParams.set("series", state.series);
    } else {
      nextUrl.searchParams.delete("series");
    }

    if (state.q) {
      nextUrl.searchParams.set("q", state.q);
    } else {
      nextUrl.searchParams.delete("q");
    }

    history.replaceState(null, "", nextUrl.pathname + nextUrl.search);
  }

  function getSearchKeyword() {
    return String(new URLSearchParams(window.location.search).get("q") || "").trim();
  }

  function buildListUrl(basePath, state) {
    var nextUrl = new URL(basePath, window.location.origin);

    if (state.tag) {
      nextUrl.searchParams.set("tag", state.tag);
    }

    if (state.series) {
      nextUrl.searchParams.set("series", state.series);
    }

    if (state.q) {
      nextUrl.searchParams.set("q", state.q);
    }

    return nextUrl.pathname + nextUrl.search;
  }

  function getPageSize(postList) {
    var rawValue = Number(postList && postList.getAttribute("data-page-size"));
    return rawValue > 0 ? rawValue : DEFAULT_PAGE_SIZE;
  }

  function setupThemeToggle() {
    var toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  function setupSystemThemeSync() {
    if (!window.matchMedia) {
      return;
    }

    var mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function syncTheme() {
      if (getStoredTheme()) {
        return;
      }

      applyTheme(mediaQuery.matches ? "dark" : "light");
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncTheme);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(syncTheme);
    }
  }

  function setupSearchForm() {
    var searchForm = document.querySelector("[data-search-form]");
    var searchInput = document.querySelector("[data-post-search]");

    if (!searchForm || !searchInput) {
      return;
    }

    function updateSearchState() {
      var hasValue = searchInput.value.trim().length > 0;
      var isFocused = document.activeElement === searchInput;
      searchForm.classList.toggle("is-active", hasValue || isFocused);
    }

    searchInput.value = getSearchKeyword();
    updateSearchState();

    searchInput.addEventListener("focus", updateSearchState);
    searchInput.addEventListener("blur", updateSearchState);
    searchInput.addEventListener("input", updateSearchState);
  }

  function setupAlgoliaSearch() {
    var algoliaContainer = document.querySelector("[data-algolia-search]");

    if (!algoliaContainer || typeof window.docsearch !== "function") {
      return;
    }

    var searchPlaceholder = algoliaContainer.getAttribute("data-search-placeholder") || "검색어를 입력하세요";

    window.docsearch({
      container: algoliaContainer,
      appId: algoliaContainer.getAttribute("data-app-id"),
      apiKey: algoliaContainer.getAttribute("data-api-key"),
      indexName: algoliaContainer.getAttribute("data-index-name"),
      insights: algoliaContainer.getAttribute("data-insights") === "true",
      placeholder: searchPlaceholder,
      translations: {
        button: {
          buttonText: searchPlaceholder,
          buttonAriaLabel: "검색",
        },
        modal: {
          searchBox: {
            searchInputLabel: "검색",
            clearButtonTitle: "지우기",
            clearButtonAriaLabel: "검색어 지우기",
            closeButtonText: "닫기",
            closeButtonAriaLabel: "검색 닫기",
            placeholderText: searchPlaceholder,
          },
          startScreen: {
            recentSearchesTitle: "최근 검색",
            noRecentSearchesText: "최근 검색이 없습니다.",
            saveRecentSearchButtonTitle: "검색 저장",
            removeRecentSearchButtonTitle: "최근 검색 삭제",
            favoriteSearchesTitle: "즐겨찾기",
            removeFavoriteSearchButtonTitle: "즐겨찾기 삭제",
          },
          errorScreen: {
            titleText: "검색 결과를 불러오지 못했습니다.",
            helpText: "잠시 후 다시 시도해 주세요.",
          },
          noResultsScreen: {
            noResultsText: "검색 결과가 없습니다.",
            suggestedQueryText: "다른 키워드로 다시 검색해 보세요.",
            reportMissingResultsText: "찾는 결과가 없나요?",
            reportMissingResultsLinkText: "문의하기",
          },
          footer: {
            selectText: "선택",
            selectKeyAriaLabel: "엔터 키",
            navigateText: "이동",
            navigateUpKeyAriaLabel: "위 화살표 키",
            navigateDownKeyAriaLabel: "아래 화살표 키",
            closeText: "닫기",
            closeKeyAriaLabel: "Esc 키",
            searchByText: "검색 제공",
          },
        },
      },
      navigator: {
        navigate: function (_args) {
          var itemUrl = _args.itemUrl;
          window.location.assign(itemUrl);
        },
      },
    });
  }

  function readPostsFromDom(postList) {
    return Array.prototype.slice.call(postList.querySelectorAll("[data-post-card]")).map(function (card) {
      var title = card.querySelector(".post-card__title");
      var titleLink = card.querySelector(".post-card__title-link");
      var description = card.querySelector(".post-card__description");
      var series = card.querySelector(".post-card__series");
      var thumbnail = card.querySelector(".post-card__thumbnail img");
      var metaItems = Array.prototype.slice.call(card.querySelectorAll(".post-card__meta span"));
      var tags = card.getAttribute("data-tags");

      return {
        title: title ? title.textContent.trim() : "",
        url: titleLink ? titleLink.getAttribute("href") : "",
        description: description ? description.textContent.trim() : "",
        thumbnail: thumbnail ? thumbnail.getAttribute("src") : "",
        tags: tags ? tags.split("|").filter(Boolean) : [],
        series_key: card.getAttribute("data-series-key") || "",
        series_title: card.getAttribute("data-series-label") || (series ? series.textContent.trim() : ""),
        date_label: metaItems[0] ? metaItems[0].textContent.trim() : "",
        reading_time_label: metaItems[2] ? metaItems[2].textContent.trim() : "",
        search: card.getAttribute("data-search") || "",
      };
    });
  }

  function renderPostCard(post, basePath) {
    var article = document.createElement("article");
    var title = escapeHtml(post.title);
    var url = escapeHtml(post.url);
    var description = escapeHtml(post.description);
    var seriesTitle = escapeHtml(post.series_title);
    var tags = Array.isArray(post.tags) ? post.tags : [];
    var thumbnail = post.thumbnail ? escapeHtml(post.thumbnail) : "";
    var dateLabel = escapeHtml(post.date_label);
    var readingTimeLabel = escapeHtml(post.reading_time_label);
    var tagsHtml = tags
      .map(function (tag) {
        return '<a class="tag-chip" href="' + escapeHtml(buildListUrl(basePath, { tag: tag })) + '">' + escapeHtml(tag) + "</a>";
      })
      .join("");

    article.className = "post-card";
    article.innerHTML =
      (thumbnail
        ? '<a class="post-card__thumbnail" href="' +
          url +
          '"><img src="' +
          thumbnail +
          '" alt="' +
          title +
          '" loading="lazy" decoding="async"></a>'
        : "") +
      (seriesTitle ? '<p class="post-card__series">' + seriesTitle + "</p>" : "") +
      '<a class="post-card__title-link" href="' +
      url +
      '"><h2 class="post-card__title">' +
      title +
      "</h2></a>" +
      (description ? '<p class="post-card__description">' + description + "</p>" : "") +
      (tagsHtml ? '<div class="post-card__tags">' + tagsHtml + "</div>" : "") +
      '<div class="post-card__meta"><span>' +
      dateLabel +
      '</span><span class="post-card__dot">·</span><span>' +
      readingTimeLabel +
      "</span></div>";

    return article;
  }

  function setupPostFilters() {
    var searchForm = document.querySelector("[data-search-form]");
    var searchInput = document.querySelector("[data-post-search]");
    var postList = document.querySelector("[data-post-list]");
    var sentinel = document.querySelector("[data-post-sentinel]");
    var more = document.querySelector("[data-post-more]");

    if (!postList) {
      return;
    }

    var tagLinks = Array.prototype.slice.call(document.querySelectorAll("[data-tag-link]"));
    var summary = document.querySelector("[data-post-summary]");
    var empty = document.querySelector("[data-post-empty]");
    var params = new URLSearchParams(window.location.search);
    var state = {
      tag: normalizeValue(params.get("tag")),
      series: normalizeValue(params.get("series")),
      q: searchInput ? String(params.get("q") || "").trim() : "",
    };
    var basePath = searchForm && searchForm.getAttribute("action") ? searchForm.getAttribute("action") : window.location.pathname;
    var pageSize = getPageSize(postList);
    var fallbackPosts = readPostsFromDom(postList);
    var postIndexUrl = postList.getAttribute("data-post-index-url");
    var allPosts = null;
    var loadingPromise = null;
    var matchedPosts = [];
    var visibleLimit = pageSize;

    function hasActiveFilters() {
      return Boolean(state.tag || state.series || state.q);
    }

    if (hasActiveFilters()) {
      postList.innerHTML = "";
    }

    if (searchInput) {
      searchInput.value = state.q;
    }

    function updateTagLinks() {
      tagLinks.forEach(function (link) {
        var rawTagFilter = link.getAttribute("data-tag-filter") || "";
        var tagFilter = normalizeValue(rawTagFilter);
        var isActive = tagFilter ? tagFilter === state.tag : !state.tag;

        link.classList.toggle("is-active", isActive);
        link.href = buildListUrl(basePath, {
          tag: rawTagFilter,
          q: state.q,
        });
      });
    }

    function updateSummary(visibleCount) {
      if (!summary) {
        return;
      }

      if (searchInput && state.q) {
        summary.hidden = false;
        if (visibleCount === 0) {
          summary.textContent = "검색 결과가 없습니다.";
        } else {
          summary.innerHTML = '총 <strong>' + visibleCount + "개</strong>의 포스트를 찾았습니다.";
        }
        return;
      }

      summary.hidden = true;
    }

    function updatePaginationState() {
      var hasMore = matchedPosts.length > visibleLimit;

      if (!allPosts && !hasActiveFilters()) {
        hasMore = Boolean(postIndexUrl) && fallbackPosts.length === pageSize;
      }

      if (more) {
        more.hidden = !hasMore;
      }

      if (sentinel) {
        sentinel.hidden = !hasMore;
      }
    }

    function renderVisiblePosts() {
      var fragment = document.createDocumentFragment();

      postList.innerHTML = "";

      matchedPosts.slice(0, visibleLimit).forEach(function (post) {
        fragment.appendChild(renderPostCard(post, basePath));
      });

      postList.appendChild(fragment);

      if (empty) {
        empty.hidden = matchedPosts.length !== 0;
      }

      updateSummary(matchedPosts.length);
      updateTagLinks();
      updatePaginationState();
    }

    function filterPosts(posts) {
      var query = normalizeValue(state.q);

      return posts.filter(function (post) {
        var tagValues = Array.isArray(post.tags) ? post.tags.map(normalizeValue) : [];
        var seriesKey = normalizeValue(post.series_key);
        var searchText = normalizeValue(
          post.search ||
            [post.title, post.description, Array.isArray(post.tags) ? post.tags.join(" ") : "", post.series_title]
              .join(" ")
              .trim()
        );
        var matchesTag = !state.tag || tagValues.indexOf(state.tag) !== -1;
        var matchesSeries = !state.series || seriesKey === state.series;
        var matchesQuery = !query || searchText.indexOf(query) !== -1;

        return matchesTag && matchesSeries && matchesQuery;
      });
    }

    function ensurePostIndexLoaded() {
      if (allPosts) {
        return Promise.resolve(allPosts);
      }

      if (loadingPromise) {
        return loadingPromise;
      }

      if (!postIndexUrl) {
        allPosts = readPostsFromDom(postList);
        return Promise.resolve(allPosts);
      }

      postList.setAttribute("aria-busy", "true");
      loadingPromise = window
        .fetch(postIndexUrl, { credentials: "same-origin" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Failed to load post index.");
          }

          return response.json();
        })
        .then(function (payload) {
          allPosts = payload && Array.isArray(payload.posts) ? payload.posts : [];
          return allPosts;
        })
        .catch(function () {
          allPosts = fallbackPosts;
          return allPosts;
        })
        .then(function (posts) {
          postList.removeAttribute("aria-busy");
          return posts;
        });

      return loadingPromise;
    }

    function applyFilters() {
      visibleLimit = pageSize;

      return ensurePostIndexLoaded().then(function (posts) {
        matchedPosts = filterPosts(posts);
        renderVisiblePosts();
      });
    }

    function loadMorePosts() {
      if (!allPosts) {
        ensurePostIndexLoaded().then(function (posts) {
          matchedPosts = filterPosts(posts);
          if (matchedPosts.length <= visibleLimit) {
            updatePaginationState();
            return;
          }

          visibleLimit += pageSize;
          renderVisiblePosts();
        });
        return;
      }

      if (matchedPosts.length <= visibleLimit) {
        return;
      }

      visibleLimit += pageSize;
      renderVisiblePosts();
    }

    if (searchForm && searchInput) {
      searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        state.q = searchInput.value.trim();
        updateUrl(state);
        applyFilters();
      });
    }

    if (searchInput) {
      var debounceTimer = 0;
      searchInput.addEventListener("input", function () {
        state.q = searchInput.value.trim();
        applyFilters();
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(function () {
          updateUrl(state);
        }, 200);
      });
    }

    if (sentinel) {
      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                loadMorePosts();
              }
            });
          },
          { rootMargin: "320px 0px" }
        );

        observer.observe(sentinel);
      } else {
        window.addEventListener(
          "scroll",
          function () {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 320) {
              loadMorePosts();
            }
          },
          { passive: true }
        );
      }
    }

    updateTagLinks();
    updatePaginationState();

    if (hasActiveFilters()) {
      applyFilters();
      return;
    }

    matchedPosts = fallbackPosts.slice(0, visibleLimit);
    if (empty) {
      empty.hidden = fallbackPosts.length !== 0;
    }
  }

  function setupGiscusThemeSync() {
    var container = document.querySelector("[data-comments-provider='giscus']");
    var iframe;

    if (!container) {
      return;
    }

    iframe = container.querySelector("iframe.giscus-frame");
    if (iframe) {
      bindGiscusFrame(iframe);
    }

    if (typeof MutationObserver === "function") {
      var observer = new MutationObserver(function () {
        var nextFrame = container.querySelector("iframe.giscus-frame");

        if (nextFrame) {
          bindGiscusFrame(nextFrame);
        }
      });

      observer.observe(container, { childList: true, subtree: true });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupAlgoliaSearch();
    setupGiscusThemeSync();
    setupSearchForm();
    setupThemeToggle();
    setupSystemThemeSync();
    setupPostFilters();
  });
})();

pipeline {
  agent any

  options {
    timestamps()
  }

  triggers {
    cron('17 3 * * *')
  }

  environment {
    PAGES_BRANCH = 'gh-pages'
    PUBLISH_DIR = '_site'
    BUNDLE_PATH = 'vendor/bundle'
  }

  stages {
    stage('Install Dependencies') {
      steps {
        sh '''
          set -eu
          BUNDLE_FORCE_RUBY_PLATFORM=true bundle install --path "$BUNDLE_PATH" --jobs=4 --retry=3
        '''
      }
    }

    stage('Fetch GitHub Contributions') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'github-pages',
            usernameVariable: 'GITHUB_USER',
            passwordVariable: 'GITHUB_TOKEN'
          )
        ]) {
          sh '''
            set -eu
            export GITHUB_GRAPHQL_TOKEN="$GITHUB_TOKEN"
            export GITHUB_CONTRIBUTIONS_STRICT=1
            ruby scripts/fetch_github_contributions.rb
          '''
        }
      }
    }

    stage('Build Site') {
      steps {
        sh '''
          set -eu
          BUNDLE_FORCE_RUBY_PLATFORM=true bundle exec jekyll build
          test -d "$PUBLISH_DIR"
          test -f "$PUBLISH_DIR/index.html"
        '''
      }
    }

    stage('Deploy To GitHub Pages') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'github-pages',
            usernameVariable: 'GITHUB_USER',
            passwordVariable: 'GITHUB_TOKEN'
          )
        ]) {
          sh '''
            set -eu

            ORIGIN_URL="$(git config --get remote.origin.url)"
            case "$ORIGIN_URL" in
              git@github.com:*)
                REPO_PATH="${ORIGIN_URL#git@github.com:}"
                ;;
              https://github.com/*)
                REPO_PATH="${ORIGIN_URL#https://github.com/}"
                ;;
              *)
                echo "Unsupported origin URL: $ORIGIN_URL" >&2
                exit 1
                ;;
            esac

            AUTH_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${REPO_PATH}"
            TMP_DIR="$(mktemp -d)"
            trap 'rm -rf "$TMP_DIR"' EXIT

            git clone "$AUTH_URL" "$TMP_DIR/repo"
            cd "$TMP_DIR/repo"

            if git ls-remote --exit-code --heads origin "$PAGES_BRANCH" >/dev/null 2>&1; then
              git checkout -B "$PAGES_BRANCH" "origin/$PAGES_BRANCH"
            else
              git checkout --orphan "$PAGES_BRANCH"
              git rm -rf . >/dev/null 2>&1 || true
            fi

            find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
            cp -R "$WORKSPACE/$PUBLISH_DIR"/. .
            touch .nojekyll

            git add --all
            if git diff --cached --quiet; then
              echo "No changes to publish."
              exit 0
            fi

            git config user.name "Jenkins"
            git config user.email "jenkins@local"
            git commit -m "Deploy GitHub Pages from Jenkins (${BUILD_TAG})"
            git push origin "$PAGES_BRANCH"
          '''
        }
      }
    }
  }

  post {
    success {
      echo 'Deployment finished. Set GitHub Pages source to the gh-pages branch.'
    }
  }
}

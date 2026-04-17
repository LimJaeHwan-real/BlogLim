---
title: "3/27 DP(Dynamic Programming)"
description: "큰 문제를 작은 부분 문제로 나누어 해결 부분 문제의 결과를 저장하여 재사용 중복 계산을 제거하여 효율성 향상 피보나치 수열 [재귀 O(2^n)] -> [DP O(n)] 으로 극적인 성능 향상! 메모이제이션 - 계산 결과를 memo에 저장 - 같은 값"
date: 2026-03-28 00:19:49 +09:00
updated_at: 2026-03-31 11:00:05 +09:00
thumbnail: "https://t1.daumcdn.net/tistory_admin/static/images/openGraph/opengraph.png"
categories:
  - "Jungle"
  - "Everyday"
source_url: "https://forrest7.tistory.com/41"
---
<p>큰 문제를 작은 부분 문제로 나누어 해결</p>
<p>부분 문제의 결과를 저장하여 재사용</p>
<p>중복 계산을 제거하여 효율성 향상</p>

<p>피보나치 수열 [재귀 O(2^n)] -&gt; [DP O(n)] 으로 극적인 성능 향상!</p>

<p><b>메모이제이션</b></p>
<p>- 계산 결과를 memo에 저장</p>
<p>- 같은 값을 다시 계산할 필요 없음</p>
<p>- 캐싱과 유사한 개념</p>

<p><b>DP가 필요한 경우</b></p>
<p>1. 최적 부분 구조: 부분 문제의 최적해로 전체 최적해 구성</p>
<p>2. 중복 부분 문제: 같은 문제가 반복적으로 등장</p>

<p><a href="https://leetcode.com/problems/house-robber/description/?envType=study-plan-v2&amp;envId=top-interview-150">https://leetcode.com/problems/house-robber/description/?envType=study-plan-v2&amp;envId=top-interview-150</a></p>
<p><a href="https://leetcode.com/problems/house-robber/description">House Robber - LeetCode</a></p>
<figure>
  <img src="https://blog.kakaocdn.net/dna/cHhQlV/dJMcadajKur/AAAAAAAAAAAAAAAAAAAAAKdYOtzpYN648VyHrgGm4swMeNv7OCSFf_JQIbT_jhBh/img.png" alt="이미지">
</figure>

<p>연속 해서 집을 털 수 없다.</p>
<p>dp 배열을 어떻게 정의 해야 할지가 중요하다</p>
<p>dp[n]= n번째까지 집을 털었을 경우 최대 금액</p>
<p>nums 에 각 집의 소지액을 나타내는 정수 배열이 주어졌다.</p>

<p>max( n번째 집을 선택했을 경우, n번째 집을 선택하지 않았을 경우 )</p>
<p>n번째 집을 선택했을 경우)연속된 n-1번째는 선택하지 못한다. -&gt; nums[n] + dp[n-2]</p>
<p>n번째 집을 선택하지 않았을 경우)n-1번째까지의 최댓값이 된다.</p>
<p>dp[n]= max(dp[n-2] + nums[n], dp[n-1])</p>

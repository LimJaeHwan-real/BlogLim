---
title: "Explicit Free List"
description: "Explicit Free List: Unordered vs. Address-Ordered Explicit Free List(명시적 가용 리스트)는 가용 블록(Free Block) 내에 next와 prev 포인터를 포함시켜, 가용 블록들끼리만 연결 리스"
date: 2026-04-16 19:42:22 +09:00
updated_at: 2026-04-16 19:42:22 +09:00
thumbnail: "/assets/images/blog-icon.svg"
categories:
  - "프로그래밍 언어"
  - "C언어"
source_url: "https://forrest7.tistory.com/52"
---
<h2>Explicit Free List: Unordered vs. Address-Ordered</h2>
<ul>
<li>Explicit Free List(명시적 가용 리스트)는 가용 블록(Free Block) 내에 next와 prev 포인터를 포함시켜, 가용 블록들끼리만 연결 리스트 형태로 관리하는 방식입니다. 이때 리스트를 유지하는 두 가지 주요 전략을 비교해 드립니다.</li>
</ul>
<div><hr /></div>
<h3>1. Unordered (LIFO - Last-In-First-Out)</h3>
<p>가용 블록을 리스트에 삽입할 때 특별한 순서 없이, 보통 리스트의 맨 앞(Root)에 가장 최근에 반환된 블록을 넣는 방식입니다.</p>
<ul>
<li><b>동작:</b> free()가 호출되면 해당 블록을 리스트의 시작 부분에 즉시 연결합니다.</li>
</ul>
<ul>
<li><b>장점 (O(1)):</b> 삽입 속도가 매우 빠릅니다. 단순히 포인터 몇 개만 바꿔주면 끝납니다.</li>
</ul>
<ul>
<li><b>단점:</b> 메모리 주소와 상관없이 리스트가 구성되므로, 인접한 가용 블록들을 합치는 <b>Coalescing(병합)</b> 효율이 떨어질 수 있으며, Address-ordered 방식에 비해 메모리 단편화(Fragmentation)가 더 많이 발생할 수 있습니다.</li>
</ul>
<div><hr /></div>
<h3>2. Address-Ordered (주소 순서 정렬)</h3>
<p>가용 리스트의 블록들을 항상 <b>메모리 주소 순서대로</b> 정렬된 상태로 유지하는 방식입니다. (예: Addr(A) &lt; Addr(B) &lt; Addr(C))</p>
<ul>
<li><b>동작:</b> free()가 호출되면 리스트를 처음부터 순회하며, 해당 블록의 주소가 들어갈 적절한 위치를 찾아 삽입합니다.</li>
</ul>
<ul>
<li><b>장점:</b> First-fit 검색 시 메모리 낮은 주소부터 효율적으로 채울 수 있고, 인접한 블록이 리스트 상에서도 앞뒤에 위치할 가능성이 높아 <b>병합(Coalescing) 성능이 우수</b>합니다. 결과적으로 단편화가 적습니다.</li>
</ul>
<ul>
<li><b>단점 (O(n)):</b> 삽입할 때마다 리스트를 탐색해야 하므로 반환(free) 작업 시 시간이 더 소요됩니다.</li>
</ul>
<div><hr /></div>
<h3>💡 한눈에 비교하기</h3>
<table border="1">
<tbody>
<tr>
<td><b>구분</b></td>
<td><b>Unordered (LIFO)</b></td>
<td><b>Address-Ordered</b></td>
</tr>
<tr>
<td><b>삽입 속도</b></td>
<td><b>매우 빠름 (O(1))</b></td>
<td>상대적으로 느림 (O(n))</td>
</tr>
<tr>
<td><b>단편화 방지</b></td>
<td>보통 수준</td>
<td><b>우수함</b></td>
</tr>
<tr>
<td><b>병합 효율</b></td>
<td>보통</td>
<td>매우 높음</td>
</tr>
<tr>
<td><b>구현 난이도</b></td>
<td>쉬움</td>
<td>리스트 순회 로직 필요</td>
</tr>
</tbody>
</table>

<h1>Implicit VS Explicit 비교</h1>
<figure>
  <img src="https://blog.kakaocdn.net/dna/cuLyWU/dJMcahRBQCr/AAAAAAAAAAAAAAAAAAAAAPbxpwNEUQMtn6RHjSc9oOF2PyY-O0co6sDuwBYBtldu/img.png" alt="이미지">
</figure>

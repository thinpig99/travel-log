import TabBar from '../components/TabBar';

export default function Board() {
  return (
    <div className="screen">
      <main className="page with-tabs">
        <h1 className="title">게시판</h1>
        <div className="notice stack gap8">
          <b>곧 열려요</b>
          <span>다른 사람의 여행 기록을 여행지별로 찾아보고, 좋아요를 누르고 내 여행으로 복제하는 공간이에요. 지금은 내 여행을 먼저 채워주세요.</span>
        </div>
      </main>
      <TabBar />
    </div>
  );
}

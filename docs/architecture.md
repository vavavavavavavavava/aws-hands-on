# 構成概要（簡単な掲示板）

- 前の資料: [README](../README.md)
- 次に読む資料: [ハンズオン本編](./handson-board.md)

## アーキテクチャ

1. ユーザーが Amplify Hosting の掲示板画面にアクセス
2. ユーザー登録・ログインは Cognito User Pool を利用
3. フロントが API Gateway REST API を呼び出し
4. API Gateway が Lambda を実行
5. Lambda が DynamoDB `BoardPosts` を読み書き
6. ソースコードは CodeCommit で管理

## API 一覧

- `GET /posts` 投稿一覧取得
- `POST /posts` 投稿作成
- `DELETE /posts/{postId}` 投稿削除（作成者のみ）

## データモデル

- テーブル名: `BoardPosts`
- PK: `postId` (String)
- GSI: `gsi1`（PK: `boardId`, SK: `createdAt`）
- 属性: `postId`, `boardId`, `title`, `content`, `authorSub`, `authorName`, `createdAt`

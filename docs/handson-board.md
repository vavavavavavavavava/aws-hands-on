# ハンズオン本編: AWSで作る「簡単な掲示板」

- 前に読む資料: [構成概要](./architecture.md)
- 迷ったら戻る: [README](../README.md)

## 0. この資料の使い方

この資料は「そのまま操作すれば進む」ように、画面操作を細かく書いています。

- AWS は同一リージョンで作成してください（例: `ap-northeast-1`）
- まず 1 章から順に進めてください
- コードは本資料からコピーして貼り付けます

## 1. 事前準備

### 1-1. 事前準備ドキュメントを実施

1. [AWSアカウント作成手順](./setup-aws-account.md)
2. [Gitインストール手順（Windows）](./setup-git-windows.md)

### 1-2. ルートユーザーで IAM ハンズオンユーザーを作成

このステップだけルートユーザーで実施します。以降の作業は IAM ユーザーで行います。

1. AWS マネジメントコンソールにルートユーザーでログイン
   1. AWS のサインイン画面を開く
   2. `ルートユーザー` のログイン導線を選ぶ
   3. ルートユーザーのメールアドレスを入力して次へ進む
   4. ルートユーザーのパスワードを入力してサインインする
   5. MFA を求められたら、認証アプリを開いて確認コードを入力する
2. コンソール検索で `IAM` を開く
3. 左メニュー `ユーザー` -> `ユーザーを作成`
4. ユーザー名: `handson-user`
5. `AWS マネジメントコンソールへのユーザーアクセスを提供する` を有効化
6. コンソールパスワードは `自動生成されたパスワード` のままにする。`ユーザーは次回のサインイン時に新しいパスワードを作成する必要があります - 推奨` は、パスワード変更をしたい場合はチェックを入れ、そのまま進めたい場合はチェックを外す
7. `次へ`
8. `アクセス許可を設定` で `ポリシーを直接アタッチする` を選択
9. 学習用アカウントの場合は `AdministratorAccess` を選択
10. `次へ` -> `ユーザーを作成`
11. 作成完了画面で `.csv ファイルをダウンロード` を押して保存する
12. ダウンロードした `.csv` にサインイン URL と初期パスワードが含まれていることを確認する

### 1-3. IAM ハンズオンユーザーで再ログイン

1. ルートユーザーからサインアウト
   1. 画面右上のアカウント名を押す
   2. `サインアウト` を押す
2. 手順 1-2 で保存した `.csv` を開き、サインイン URL を開く
3. `.csv` に記載されたユーザー名と初期パスワードでログイン
4. パスワード変更を求められた場合だけ、その場で任意のパスワードに変更する
5. 画面右上のリージョンを選択（例: `Asia Pacific (Tokyo)`）

### 1-4. ローカル作業フォルダを開く

1. エクスプローラーでこのプロジェクトフォルダ（`README.md` がある場所）を開く
2. フォルダ内の空白部分を右クリックし、`ターミナルで開く`（または `コマンドプロンプトをここで開く`）を選ぶ
3. 開いた画面で `dir` を実行し、`README.md` と `src` フォルダが表示されることを確認する

## 2. DynamoDB テーブル作成

1. AWS コンソール上部の検索で `DynamoDB` と入力して開く
2. 左メニュー `テーブル` を開く
3. `テーブルを作成` を押す
4. 以下を入力

- テーブル名: `BoardPosts`
- パーティションキー: `postId`
- キータイプ: `文字列`

1. `テーブル設定` は `デフォルト設定` のまま
2. `テーブルを作成` を押す
3. 作成後、対象テーブルを開く
4. `インデックス` タブを開く
5. `インデックスを作成` を押す
6. 以下を入力

- パーティションキー: `boardId`（文字列）
- ソートキー: `createdAt`（文字列）
- インデックス名: `gsi1`（自動入力される場合はそのまま）

1. `インデックスを作成` を押す

## 3. Cognito User Pool 作成

1. AWS コンソール検索で `Cognito` を開く
2. `ユーザープール` を開き `ユーザープールを作成` を押す
3. `アプリケーションタイプ` は `従来のウェブアプリケーション` を選択
4. `サインインオプション` は `メール` を選択
5. `パスワードポリシー` は既定値のまま
6. `多要素認証` は `MFA なし`（学習用）
7. `ユーザーアカウントの復旧` は既定値
8. `ユーザーディレクトリを作成`（または `ユーザープールを作成`）を押す
9. 作成した User Pool の詳細画面で次を控える

- `User pool ID`
- `アプリケーション統合` タブ内の `アプリクライアント ID`

## 4. IAM ロール作成 + Lambda 関数 3 本作成

この章は「IAMで専用ロールを1つ作成 -> その既存ロールを使って Lambda を3本作成」の順で進めます。

### 4-1. IAM で専用ロールを作成

1. AWS コンソール検索で `IAM` を開く
2. 左メニュー `ロール` -> `ロールを作成`
3. `信頼されたエンティティタイプ` は `AWS のサービス`
4. `ユースケース` は `Lambda`
5. `次へ`
6. `許可ポリシー` で `AWSLambdaBasicExecutionRole` にチェック
7. `次へ`
8. ロール名: `board-lambda-exec-role`
9. `ロールを作成`
10. 作成した `board-lambda-exec-role` を開く
11. `アクセス許可を追加` -> `インラインポリシーを作成`
12. `JSON` タブに以下を貼り付け

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-northeast-1:<AWSアカウントID>:table/BoardPosts",
        "arn:aws:dynamodb:ap-northeast-1:<AWSアカウントID>:table/BoardPosts/index/gsi1"
      ]
    }
  ]
}
```

1. `<AWSアカウントID>` を実値に置換
2. `次へ`
3. ポリシー名: `BoardPostsAccessPolicy`
4. `ポリシーを作成`

### 4-2. Lambda 作成の共通手順（既存ロールを使う）

1. AWS コンソール検索で `Lambda` を開く
2. `関数` -> `関数の作成`
3. `一から作成` を選択
4. 入力

- 関数名: 章ごとの名前を入力
- ランタイム: `Node.js 20.x`
- アーキテクチャ: `x86_64`（既定値）

1. `アクセス権限` で `デフォルトの実行ロールの変更` を開く
2. `既存のロールを使用する` を選択
3. 既存ロールに `board-lambda-exec-role` を選択
4. `関数の作成` を押す
5. 関数画面の `コード` タブで `index.mjs` を開く
6. 本資料のコードを全文貼り付け
7. 右上 `デプロイ` を押す
8. `設定` タブ -> `環境変数` -> `編集`
9. `環境変数を追加`

- Key: `TABLE_NAME`
- Value: `BoardPosts`

1. `保存` を押す

### 4-3. 関数1 `board-list-posts`

- 関数名: `board-list-posts`
- `index.mjs` に以下を貼り付けて `デプロイ`

```js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const res = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
  },
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  try {
    const boardId = event?.queryStringParameters?.boardId || "main";
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "gsi1",
        KeyConditionExpression: "boardId = :boardId",
        ExpressionAttributeValues: { ":boardId": boardId },
        ScanIndexForward: false,
        Limit: 50
      })
    );
    return res(200, { items: result.Items || [] });
  } catch (e) {
    console.error(e);
    return res(500, { message: "Internal Server Error" });
  }
};
```

### 4-4. 関数2 `board-create-post`

- 関数名: `board-create-post`
- `index.mjs` に以下を貼り付けて `デプロイ`

```js
import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const res = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
  },
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims || {};
    const authorSub = claims.sub;
    const authorName = claims.email || claims.username || "anonymous";
    if (!authorSub) return res(401, { message: "Unauthorized" });

    const body = JSON.parse(event.body || "{}");
    const title = (body.title || "").trim();
    const content = (body.content || "").trim();
    const boardId = (body.boardId || "main").trim();

    if (!title || !content) {
      return res(400, { message: "title and content are required" });
    }

    const item = {
      postId: randomUUID(),
      boardId,
      title,
      content,
      authorSub,
      authorName,
      createdAt: new Date().toISOString()
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return res(201, item);
  } catch (e) {
    console.error(e);
    return res(500, { message: "Internal Server Error" });
  }
};
```

### 4-5. 関数3 `board-delete-post`

- 関数名: `board-delete-post`
- `index.mjs` に以下を貼り付けて `デプロイ`

```js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const res = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS"
  },
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims || {};
    const requesterSub = claims.sub;
    const postId = event?.pathParameters?.postId;

    if (!requesterSub) return res(401, { message: "Unauthorized" });
    if (!postId) return res(400, { message: "postId is required" });

    const got = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { postId } }));
    if (!got.Item) return res(404, { message: "Not Found" });
    if (got.Item.authorSub !== requesterSub) return res(403, { message: "Forbidden" });

    await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { postId } }));
    return res(200, { message: "Deleted", postId });
  } catch (e) {
    console.error(e);
    return res(500, { message: "Internal Server Error" });
  }
};
```

### 4-6. 既存ロールで作成できているか確認

1. Lambda の `board-list-posts` を開く
2. `設定` -> `アクセス権限` を開く
3. `実行ロール` が `board-lambda-exec-role` であることを確認
4. 同様に `board-create-post` / `board-delete-post` でも確認

## 5. API Gateway（REST API）作成

### 5-1. API 作成

1. AWS コンソール検索で `API Gateway` を開く
2. `API` -> `API を作成`
3. `REST API` の `構築` を押す
4. `新しい API` を選択し以下を入力

- API 名: `board-api`
- エンドポイントタイプ: `リージョナル`

1. `API を作成`

### 5-2. リソース作成

1. 左ツリーで `/` を選択
2. `アクション` -> `リソースの作成`
3. リソース名: `posts`
4. リソースパス: `/posts`
5. `リソースの作成`
6. `/posts` を選択 -> `アクション` -> `リソースの作成`
7. リソース名: `postById`
8. リソースパス: `/{postId}`
9. `リソースの作成`

### 5-3. メソッド作成（Lambda 連携）

1. `/posts` を選択 -> `アクション` -> `メソッドの作成` -> `GET`
2. 統合タイプ: `Lambda 関数`
3. `Lambda プロキシ統合の使用` を ON
4. Lambda リージョンを選択
5. Lambda 関数: `board-list-posts`
6. `保存` -> `OK`

同様に `/posts` に `POST` を作成し、Lambda を `board-create-post` に設定。

同様に `/{postId}` に `DELETE` を作成し、Lambda を `board-delete-post` に設定。

### 5-4. Cognito Authorizer 作成

1. 左メニュー `オーソライザー` -> `新しいオーソライザーを作成`
2. 名前: `board-cognito-auth`
3. タイプ: `Cognito`
4. Cognito ユーザープール: 手順 3 で作成したユーザープール
5. トークンソース: `Authorization`
6. `作成`

### 5-5. 各メソッドへ Authorizer 適用

対象: `GET /posts`, `POST /posts`, `DELETE /posts/{postId}`。

1. 対象メソッドをクリック
2. `メソッドリクエスト` を開く
3. `Authorization` の鉛筆アイコンで `board-cognito-auth` を選択
4. `✓` で保存

### 5-6. CORS 設定

1. `/posts` を選択
2. `アクション` -> `CORS を有効化`
3. Access-Control-Allow-Origin: `*`
4. Access-Control-Allow-Headers: `Content-Type,Authorization`
5. Access-Control-Allow-Methods: `GET,POST,OPTIONS`
6. `CORS を有効化して既存の CORS ヘッダーを置き換える`

同様に `/{postId}` でも CORS を有効化し、Methods は `DELETE,OPTIONS`。

### 5-7. デプロイ

1. `アクション` -> `API のデプロイ`
2. デプロイステージ: `新しいステージ`
3. ステージ名: `dev`
4. `デプロイ`
5. `呼び出し URL` を控える（例: `https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/dev`）

## 6. フロントエンド設定（ローカルファイル編集）

1. `src/frontend/aws-exports.sample.js` を参照
2. `src/frontend/aws-exports.js` を開く
3. 以下を実値に置換

- `region`
- `userPoolId`
- `userPoolWebClientId`
- `apiBaseUrl`

設定例:

```js
window.awsConfig = {
  Auth: {
    region: "ap-northeast-1",
    userPoolId: "ap-northeast-1_xxxxx",
    userPoolWebClientId: "xxxxxxxxxxxxxxxx",
    mandatorySignIn: true
  },
  apiBaseUrl: "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/dev"
};
```

## 7. CodeCommit 作成と push

### 7-1. CodeCommit リポジトリ作成（ブラウザ）

1. AWS コンソール検索で `CodeCommit` を開く
2. `リポジトリ` -> `リポジトリを作成`
3. リポジトリ名: `aws-hands-on-board`
4. `作成`
5. 右上 `クローン URL` の `HTTPS` を控える
6. 例: `https://git-codecommit.ap-northeast-1.amazonaws.com/v1/repos/aws-hands-on-board`

### 7-2. IAM ユーザーの Git credentials（HTTPS）を発行

1. AWS コンソールで `IAM` を開く
2. `ユーザー` -> `handson-user` を開く
3. `セキュリティ認証情報` タブを開く
4. `AWS CodeCommit 用 HTTPS Git 認証情報` セクションの `認証情報を生成` を押す
5. 表示された `Git ユーザー名` と `Git パスワード` を安全な場所に控える

注記: この教材では、CodeCommit への Git 操作はこの `Git ユーザー名 / Git パスワード` を使います（AWS CLI は使いません）。

### 7-3. ローカルから push

手順 7-1 で控えた HTTPS URL を、次の `<CodeCommit HTTPS URL>` 部分にそのまま貼り付けます。
コマンドは、このプロジェクトのルートディレクトリ（`README.md` がある場所）で実行してください。
Windows では、エクスプローラーでフォルダを開いて右クリックし、`ターミナルで開く` から実行するのが簡単です。

```bash
cd <このプロジェクトのルートディレクトリ>
git init
git add .
git commit -m "initial handson materials and frontend"
git branch -M main
git remote add origin <CodeCommit HTTPS URL>
git push -u origin main
```

例:

```bash
git remote add origin https://git-codecommit.ap-northeast-1.amazonaws.com/v1/repos/aws-hands-on-board
```

`origin` が既にある場合は、次を実行してください。

```bash
git remote set-url origin https://git-codecommit.ap-northeast-1.amazonaws.com/v1/repos/aws-hands-on-board
```

`git push` 時に認証入力が求められたら、手順 7-2 で発行した以下を入力します。

- Username: `Git ユーザー名`
- Password: `Git パスワード`

## 8. Amplify Hosting で公開

1. AWS コンソール検索で `Amplify` を開く
2. `新しいアプリ` -> `ウェブアプリをホスト`
3. ソースコードプロバイダー: `AWS CodeCommit`
4. リポジトリ: `aws-hands-on-board`
5. ブランチ: `main`
6. アプリのビルド設定で `ビルドイメージ設定` は既定値
7. `アプリルート` に `src/frontend` を設定（UI 上で指定できる場合）
8. `次へ` -> `保存してデプロイ`

デプロイ完了後、表示された URL にアクセスします。

## 9. 動作確認（必須）

1. 掲示板画面でメールアドレスとパスワードを入力し `サインアップ`
2. 受信した確認コードを入力し `登録確認`
3. `ログイン`
4. タイトルと本文を入力し `投稿する`
5. 一覧に投稿が表示されることを確認
6. 自分の投稿を `削除` できることを確認

## 10. つまずきやすいポイント

- 401 Unauthorized
  - API Gateway の各メソッドで Authorizer が `board-cognito-auth` になっているか
  - フロント設定の `userPoolId` / `userPoolWebClientId` が正しいか
- CORS エラー
  - `/posts` と `/{postId}` の両方で CORS を設定したか
- 500 エラー
  - Lambda の環境変数 `TABLE_NAME=BoardPosts` があるか
  - Lambda 実行ロールに DynamoDB 権限があるか

## 11. 次の一歩

- 投稿編集 API（`PUT /posts/{postId}`）を追加
- 投稿一覧のページング対応
- CORS の `Allow-Origin` を Amplify ドメインに限定

## 12. 後片付け（AWSリソースの解放）

### 12-1. 先に必ず確認してください（重要）

この章では AWS リソースを削除します。削除後は元に戻せません。  
教材を継続利用する場合や、あとで見返す予定がある場合は削除しないでください。

- すぐ再利用する予定がある -> この章は実施しない
- 課金停止を優先したい -> この章を実施する

### 12-2. 削除対象チェックリスト

この教材で作成した主な削除対象は次です。

- Amplify Hosting アプリ（`aws-hands-on-board` など）
- API Gateway REST API（`board-api`）
- Lambda 関数（`board-list-posts`, `board-create-post`, `board-delete-post`）
- DynamoDB テーブル（`BoardPosts`）
- Cognito User Pool（本教材で作成したプール）
- IAM ロール（`board-lambda-exec-role`）
- CodeCommit リポジトリ（`aws-hands-on-board`）

### 12-3. 削除手順（推奨順）

1. Amplify を開き、対象アプリを選択して `アプリを削除`
2. API Gateway を開き、`board-api` を選択して `API を削除`
3. Lambda を開き、3つの関数をそれぞれ `削除`
4. DynamoDB を開き、`BoardPosts` テーブルを `削除`
5. Cognito を開き、対象ユーザープールを `削除`
6. IAM を開き、`board-lambda-exec-role` のインラインポリシーを削除後、ロールを削除
7. CodeCommit を開き、対象リポジトリを `削除`

### 12-4. 削除しないもの

次は通常、削除しません。

- ルートユーザー
- `handson-user`（今後の学習で使う場合）
- Git のローカルファイル

### 12-5. 誤削除を防ぐコツ

1. 削除前にリソース名を必ず確認する（`board-` / `BoardPosts`）
2. 迷ったら削除を中止し、一覧画面でタグ・作成日を確認する
3. 本番環境と同じアカウントではハンズオンしない

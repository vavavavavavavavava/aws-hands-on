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
3. 左メニュー `Users` -> `Create user`
4. User name: `handson-user`
5. `Provide user access to the AWS Management Console` を有効化
6. `I want to create an IAM user` を選択（表示される場合）
7. Console password は `Custom password` を選び、任意の初期パスワードを設定
8. `Next`
9. `Set permissions` で `Attach policies directly` を選択
10. 学習用アカウントの場合は `AdministratorAccess` を選択
11. `Next` -> `Create user`
12. 作成完了画面で `Console sign-in URL` を控える

### 1-3. IAM ハンズオンユーザーで再ログイン

1. ルートユーザーからサインアウト
2. 手順 1-2 で控えた `Console sign-in URL` を開く
3. `handson-user` とパスワードでログイン
4. 画面右上のリージョンを選択（例: `Asia Pacific (Tokyo)`）

### 1-4. ローカル作業フォルダを開く

1. エクスプローラーでこのプロジェクトフォルダ（`README.md` がある場所）を開く
2. フォルダ内の空白部分を右クリックし、`ターミナルで開く`（または `コマンドプロンプトをここで開く`）を選ぶ
3. 開いた画面で `dir` を実行し、`README.md` と `src` フォルダが表示されることを確認する

## 2. DynamoDB テーブル作成

1. AWS コンソール上部の検索で `DynamoDB` と入力して開く
2. 左メニュー `Tables` を開く
3. `Create table` を押す
4. 以下を入力

- Table name: `BoardPosts`
- Partition key: `postId`
- Key type: `String`

1. `Table settings` は `Default settings` のまま
2. `Create table` を押す
3. 作成後、対象テーブルを開く
4. `Indexes` タブを開く
5. `Create index` を押す
6. 以下を入力

- Partition key: `boardId`（String）
- Sort key: `createdAt`（String）
- Index name: `gsi1`（自動入力される場合はそのまま）

1. `Create index` を押す

## 3. Cognito User Pool 作成

1. AWS コンソール検索で `Cognito` を開く
2. `User pools` を開き `Create user pool` を押す
3. `Application type` は `Traditional web application` を選択
4. `Sign-in options` は `Email` を選択
5. `Password policy` は既定値のまま
6. `Multi-factor authentication` は `No MFA`（学習用）
7. `User account recovery` は既定値
8. `Create user directory`（または `Create user pool`）を押す
9. 作成した User Pool の詳細画面で次を控える

- `User pool ID`
- `App integration` タブ内の `App client ID`

## 4. IAM ロール作成 + Lambda 関数 3 本作成

この章は「IAMで専用ロールを1つ作成 -> その既存ロールを使って Lambda を3本作成」の順で進めます。

### 4-1. IAM で専用ロールを作成

1. AWS コンソール検索で `IAM` を開く
2. 左メニュー `Roles` -> `Create role`
3. `Trusted entity type` は `AWS service`
4. `Use case` は `Lambda`
5. `Next`
6. `Permissions policies` で `AWSLambdaBasicExecutionRole` にチェック
7. `Next`
8. Role name: `board-lambda-exec-role`
9. `Create role`
10. 作成した `board-lambda-exec-role` を開く
11. `Add permissions` -> `Create inline policy`
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
2. `Next`
3. Policy name: `BoardPostsAccessPolicy`
4. `Create policy`

### 4-2. Lambda 作成の共通手順（既存ロールを使う）

1. AWS コンソール検索で `Lambda` を開く
2. `Functions` -> `Create function`
3. `Author from scratch` を選択
4. 入力

- Function name: 章ごとの名前を入力
- Runtime: `Node.js 20.x`
- Architecture: `x86_64`（既定値）

1. `Permissions` で `Change default execution role` を開く
2. `Use an existing role` を選択
3. 既存ロールに `board-lambda-exec-role` を選択
4. `Create function` を押す
5. 関数画面の `Code` タブで `index.mjs` を開く
6. 本資料のコードを全文貼り付け
7. 右上 `Deploy` を押す
8. `Configuration` タブ -> `Environment variables` -> `Edit`
9. `Add environment variable`

- Key: `TABLE_NAME`
- Value: `BoardPosts`

1. `Save` を押す

### 4-3. 関数1 `board-list-posts`

- Function name: `board-list-posts`
- `index.mjs` に以下を貼り付けて `Deploy`

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

- Function name: `board-create-post`
- `index.mjs` に以下を貼り付けて `Deploy`

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

- Function name: `board-delete-post`
- `index.mjs` に以下を貼り付けて `Deploy`

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
2. `Configuration` -> `Permissions` を開く
3. `Execution role` が `board-lambda-exec-role` であることを確認
4. 同様に `board-create-post` / `board-delete-post` でも確認

## 5. API Gateway（REST API）作成

### 5-1. API 作成

1. AWS コンソール検索で `API Gateway` を開く
2. `APIs` -> `Create API`
3. `REST API` の `Build` を押す
4. `New API` を選択し以下を入力

- API name: `board-api`
- Endpoint Type: `Regional`

1. `Create API`

### 5-2. リソース作成

1. 左ツリーで `/` を選択
2. `Actions` -> `Create Resource`
3. Resource Name: `posts`
4. Resource Path: `/posts`
5. `Create Resource`
6. `/posts` を選択 -> `Actions` -> `Create Resource`
7. Resource Name: `postById`
8. Resource Path: `/{postId}`
9. `Create Resource`

### 5-3. メソッド作成（Lambda 連携）

1. `/posts` を選択 -> `Actions` -> `Create Method` -> `GET`
2. Integration type: `Lambda Function`
3. `Use Lambda Proxy integration` を ON
4. Lambda Region を選択
5. Lambda Function: `board-list-posts`
6. `Save` -> `OK`

同様に `/posts` に `POST` を作成し、Lambda を `board-create-post` に設定。

同様に `/{postId}` に `DELETE` を作成し、Lambda を `board-delete-post` に設定。

### 5-4. Cognito Authorizer 作成

1. 左メニュー `Authorizers` -> `Create New Authorizer`
2. Name: `board-cognito-auth`
3. Type: `Cognito`
4. Cognito User Pool: 手順 3 で作成した User Pool
5. Token source: `Authorization`
6. `Create`

### 5-5. 各メソッドへ Authorizer 適用

対象: `GET /posts`, `POST /posts`, `DELETE /posts/{postId}`。

1. 対象メソッドをクリック
2. `Method Request` を開く
3. `Authorization` の鉛筆アイコンで `board-cognito-auth` を選択
4. `✓` で保存

### 5-6. CORS 設定

1. `/posts` を選択
2. `Actions` -> `Enable CORS`
3. Access-Control-Allow-Origin: `*`
4. Access-Control-Allow-Headers: `Content-Type,Authorization`
5. Access-Control-Allow-Methods: `GET,POST,OPTIONS`
6. `Enable CORS and replace existing CORS headers`

同様に `/{postId}` でも CORS を有効化し、Methods は `DELETE,OPTIONS`。

### 5-7. デプロイ

1. `Actions` -> `Deploy API`
2. Deployment stage: `New Stage`
3. Stage name: `dev`
4. `Deploy`
5. `Invoke URL` を控える（例: `https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/dev`）

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
2. `Repositories` -> `Create repository`
3. Repository name: `aws-hands-on-board`
4. `Create`
5. 右上 `Clone URL` の `HTTPS` を控える
6. 例: `https://git-codecommit.ap-northeast-1.amazonaws.com/v1/repos/aws-hands-on-board`

### 7-2. IAM ユーザーの Git credentials（HTTPS）を発行

1. AWS コンソールで `IAM` を開く
2. `Users` -> `handson-user` を開く
3. `Security credentials` タブを開く
4. `HTTPS Git credentials for AWS CodeCommit` セクションの `Generate credentials` を押す
5. 表示された `Git username` と `Git password` を安全な場所に控える

注記: この教材では、CodeCommit への Git 操作はこの `Git username / Git password` を使います（AWS CLI は使いません）。

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

- Username: `Git username`
- Password: `Git password`

## 8. Amplify Hosting で公開

1. AWS コンソール検索で `Amplify` を開く
2. `New app` -> `Host web app`
3. Source code provider: `AWS CodeCommit`
4. Repository: `aws-hands-on-board`
5. Branch: `main`
6. App build settings で `Build image settings` は既定値
7. `App root` に `src/frontend` を設定（UI上で指定できる場合）
8. `Next` -> `Save and deploy`

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

1. Amplify を開き、対象アプリを選択して `Delete app`
2. API Gateway を開き、`board-api` を選択して `Delete API`
3. Lambda を開き、3つの関数をそれぞれ `Delete`
4. DynamoDB を開き、`BoardPosts` テーブルを `Delete`
5. Cognito を開き、対象 User Pool を `Delete`
6. IAM を開き、`board-lambda-exec-role` のインラインポリシーを削除後、ロールを削除
7. CodeCommit を開き、対象リポジトリを `Delete`

### 12-4. 削除しないもの

次は通常、削除しません。

- ルートユーザー
- `handson-user`（今後の学習で使う場合）
- Git のローカルファイル

### 12-5. 誤削除を防ぐコツ

1. 削除前にリソース名を必ず確認する（`board-` / `BoardPosts`）
2. 迷ったら削除を中止し、一覧画面でタグ・作成日を確認する
3. 本番環境と同じアカウントではハンズオンしない

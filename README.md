# AWS ハンズオン研修: 簡単な掲示板を作って学ぶサーバーレス入門

このリポジトリは、AWSの主要サービスを組み合わせてWebアプリを構築する研修用ハンズオン教材です。  
受講者は「ユーザー認証付きの掲示板アプリ」を題材に、設計から実装、公開までを一通り体験します。

## 研修で扱うサービス

- AWS Amplify Hosting
- AWS Identity and Access Management (IAM)
- Amazon Cognito
- Amazon API Gateway (REST)
- AWS Lambda
- Amazon DynamoDB
- AWS CodeCommit

## 研修の目的

- サーバーレス構成の全体像を理解する
- フロントエンドとバックエンドをAWS上で連携する
- 認証付きアプリをクラウドへ公開する基本手順を身につける

## 想定受講者

- AWS初学者〜入門レベルの方
- Webアプリ開発の流れをクラウド環境で学びたい方
- 認証・API・データベース連携の基礎を実践で理解したい方

## 進め方（読み順）

1. [本ページ（研修概要）](./README.md)
2. [事前準備: AWSアカウント作成](./docs/setup-aws-account.md)
3. [事前準備: Gitインストール（Windows）](./docs/setup-git-windows.md)
4. [研修導入: 全体像と登場サービスの役割](./docs/overview-and-roles.md)
5. [構成を先に把握する](./docs/architecture.md)
6. [本編ハンズオンを実施する](./docs/handson-board.md)

## 研修で到達する状態

- サインアップ / ログイン機能を備えた画面が動作する
- 投稿一覧 / 投稿作成 / 投稿削除（作成者のみ）が動作する
- Amplify Hostingでアプリを公開できる

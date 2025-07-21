# My Data Buddy

My Data Buddy is a promising start-up that aims to help people to keep track and optimize their mobile data cost.

The company wants to provide an API service that can keep track of historical data usage for their registered customers
and give recommendations for optimal data plan based on customers' usage-patterns.

Typically, a mobile carrier in Singapore would offer some data plan packages that have fixed subscription price and fixed amount of free data in GB (1GB = 1000MB). <br>
Any excess usage will be applied additional charges on top of the package's price. <br>
The amount of free data will be reset at the start of every billing cycle.

## Features
- Admin authentication and authorization
- CSV import functionality to populate the subscribers and usage table
- Subscribers and data plan management
- Data usage history
- Billing reports to get usage statistics for each subscribers

## Prerequisites
- NodeJS 18 (or higher)
- Fastify
- Prisma
- SQLite
- Jest
- Docker (optional)

## Running and testing

### Docker
1. Build the images
```shell
docker compose build
```

2. Run the app
```shell
docker compose up app
```

3. Run unit tests
```shell
docker compose run unit-test
```

4. Run integration tests
```shell
docker compose run integration-test
```

### Local development

1. Install dependencies
```shell
yarn install
```

2. Generate test data
```shell
yarn generate-test-data
```

3. Run tests
```shell
yarn test:unit

yarn test:integration
```

4. Run the app
```shell
yarn build
yarn start
```
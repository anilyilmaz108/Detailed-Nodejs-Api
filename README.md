# Detailed-Nodejs-Api

##  Nodejs Backend Api includes:

- express
- jsonwebtoken
- md5
- multer
- nodemailer
- pg
- pm2
- redis
- sequelize
- swagger
- winston

##  Setup
- For the Project, [Nodejs](https://nodejs.org/en) must be installed on your computer. 
- For the Database, [PostgreSQL](https://www.postgresql.org/) must be installed on your computer. 
- For web application installation and Cache, [Docker](https://www.docker.com/products/docker-desktop/) must be installed on your computer. 

You can use   
```shell
npm install
```
or
```shell
yarn install
```
commands to install the project. Then you can start the project:
```shell
node app.js
```

##  Swagger Documentation
After running the project, you can see the functions of the endpoints used in the project by going to http://localhost:5004/swagger/

> [!NOTE]
> You do not need to type redis-server and redis-cli into the terminal for cache operations. These operations are performed automatically after running the project with Docker.

> [!NOTE]
> A server is needed to process pm2.

> [!NOTE]
> You need an API tester for File operations with Multer.

> [!IMPORTANT]
> Once PostgreSQL is downloaded, you do not need to do anything with the database. You can remove the db.createTables() line from the comment line and run the project. Afterwards, you can comment this part in order to avoid recreating the DB every time.





## Feedback

If you have any feedback, please contact us at anilyilmaz108@gmail.com.





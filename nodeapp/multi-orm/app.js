// Express ile ORM Bağlama
// yarn add pg pg-hstore
const express = require('express')
const app = express()
const router = express.Router()
const db = require('./db/db')
const { Op, QueryTypes, json } = require("sequelize");

//Swagger Integration
var swaggerUi = require('swagger-ui-express');
    
swaggerDocument = require('./swagger.json');
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Model Dosyaları
const User = require('./models/user-model');
const Socials = require('./models/social-model');

// Winston ile Loglama
const MyLogger = require('./logs/logger')
const logger = new MyLogger()

// Redis
const { createClient } = require('redis')
const client = createClient({
    //host: 'redis-server',
    //port: 6379,
    //url: 'redis://redis:6379'
})

// Redis için docker-compose
// https://github.com/bitnami/containers/blob/main/bitnami/redis/docker-compose.yml

// Express-Validation
const validateUser = require('./middlewares/validators.middeware')
const { validationResult } = require('express-validator')

// DB -> İlişkisel Veri Tabanı
User.hasMany(Socials, { foreignKey: 'user_id' })
Socials.belongsTo(User)

// yarn add dotenv komutunu terminale yaz
// .env adında dosya oluştur
// gizli olacak bilgileri buraya ekle (PORT, SecretKey...)
// .gitignore dosyası oluştur ve .env ekle
require('dotenv').config({
    override: true
})

const PORT = process.env.APP_PORT || 5004
// Redis İşlemlerinde süre vermek için türetilebilir ttl1s, ttl1h, ttl1d e.g.
const ttl5sn = 60 * 60 * 60

app.use(express.json())
app.use(router)

// Auth Middleware
const checkout = require('./middlewares/check.middleware')
const constants = require('./constants')
router.post('/login', checkout, async(req, res) => {
    const { username, password, signedToken } = req.body
    if(constants.token == signedToken){
        logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı token üretildi = ${constants.token} `)
        console.log('Hash Password:', constants.hashToPassword(password))
        res.status(200).json({ message: 'Başarılı Giriş', username: username, password: password })
    } else {
        res.status(500).json({ message: 'Hatalı Giriş' })
        logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
    }
})

// Multer File Upload
const multer = require("multer")
const upload = multer({ dest: "uploads/" })
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
        //BODY=> FORM =>  name: file  ->  File  -> Choose File
        res.status(200).json(req.file)  
    } catch (error) {
        res.status(500).json({ message: 'Hatalı İşlem' })
        logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
    }

})

// Redis'e Bağlanma
const connectRedis = async() => {
    await client.connect()
    console.log('Redise Bağlanıldı.')
}

// User Oluşturma + Redis
router.post('/createUser', async(req, res) => {
    try{
        const { username } = req.body
        const userData = await User.create({
            username
        }, { logging: true })
        const jsonData = JSON.stringify(userData)
        const redisKey = JSON.parse(jsonData)
        logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
        res.status(200).json(userData)  
        // Redis SET
        client.set('User'+redisKey['id'], JSON.stringify(userData), {EX: ttl5sn}).then(async(v) => {
            console.log('SET ETME İŞLEMİ', v)
        }) 
    } catch(error){
        logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
        res.status(500).json({ message: 'Hata Gerçekleşti' })
        console.log('err', error)
    }
})

// Bütün Userları Listeleme + Redis
router.get('/getAllUser', async(req, res) => {
    let keys = []
      await client.keys('*').then(async(r) => {
        keys = r
        console.log('KEY LIST', keys)
    })
        if(keys.length > 0) {
            console.log('isExist', keys.length)
            logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
            await client.mGet(keys).then((async(reply) => {
                let str = "["+(reply)+"]"
                res.status(200).json(JSON.parse(str))
            })
)} else {
              console.log('NotExist', keys)
            try{
                // attributes kullanarak filtreleme yapılabilir
                // kullanılmazsa tüm veriler gelir
                const response = await User.findAll({
                    // attributes: ['test_id', 'testAd']
        
                    // OUTPUT: 
                    // item{"test_id":1,"testAd":"Ali"}
                    // item{"test_id":2,"testAd":"Ayşe"}
                })
                logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
                res.status(200).json(response)
                     // Redis MSET
            const records = {}
            response.forEach((element) => {
                records['User'+element.id] = JSON.stringify(element)
            })
            client.mSet(records, {EX: ttl5sn}).then(async(v) => {
                console.log('SET ETME İŞLEMİ', v)
            }) 
            } catch(error) {
                logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
                res.status(500).json({ message: 'Hata Gerçekleşti' })
            }
        }
   


})

// ID'ye Göre User Çekme
// const { Op } = require("sequelize");
// Detaylı sorgular için: https://sequelize.org/docs/v6/core-concepts/model-querying-basics/
router.get('/getUserById/:userId', async(req, res) => {
    const { userId } = req.params
    client.get('User'+userId).then(async(r) => {  
        if(r) {
            console.log('isExist', r)
            logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
            res.status(200).json(JSON.parse(r))
        } else {
            console.log('notExist', r)
            try{
                const findedData = await User.findByPk(userId)
                logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
                res.status(200).json(findedData)

                // Eğer Redisde Yoksa Redise Eklesin. Bir Sonraki Aramalarda DB Çağırılmasın
                client.set('User'+userId, JSON.stringify(findedData), {EX: ttl5sn}).then(async(v) => {
                    console.log('SET ETME İŞLEMİ', v)
                }) 
            } catch (error) {
                console.log('err', error)
                logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
                res.status(500).json({ message: 'Hata Gerçekleşti '})
            }
        }
    })

})

// ID'ye Göre User Silme
router.delete('/deleteUser/:userId', async(req, res) => {
    const { userId } = req.params
    client.del('User'+userId).then(async(r) => {
        if(r){
            console.log('isExist', r)
            logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
            //res.status(200).json(JSON.parse(r))
            try{
                const user = await User.findByPk(userId)
                const removedData = await user.destroy()
                console.log('removedData', removedData)
                logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
                res.status(200).json(removedData)
            } catch (error) {
                logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
                res.status(500).json({ message: 'Hata Gerçekleşti' })
                console.log('err', error)
            }
        } else {
            try{
                const user = await User.findByPk(userId)
                const removedData = await user.destroy()
                console.log('removedData', removedData)
                logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
                res.status(200).json(removedData)
            } catch (error) {
                logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
                res.status(500).json({ message: 'Hata Gerçekleşti' })
                console.log('err', error)
            }
        }
    })

})

// ONE TO MANY OPERATIONS
// User için Sosyal Medya Oluşturma
router.post('/createSocialById/:userId', async(req, res) => {
    const { userId } = req.params
    const { socialMediaName } = req.body
    try {
        const user = await User.findByPk(userId)
        const social = await Socials.create({ socialMediaName: socialMediaName }, { where: { id: userId }})
        const userWithSocial = await user.addSocials(social)
        console.log('res', userWithSocial)
        const jsonData = JSON.stringify(social)
        const redisKey = JSON.parse(jsonData)
        logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
        res.status(200).json(userWithSocial) 
        // Redis SET
        console.log(redisKey)
         client.set('UserWithSocial'+userId+redisKey['id'], JSON.stringify(social), {EX: ttl5sn}).then(async(v) => {
            console.log('SET ETME İŞLEMİ', v)
        }) 
    } catch(error) {
        logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
        res.status(500).json({ message: 'Hata Gerçekleşti' })
        console.log('err', error)
    }
})

// User İçin Tüm Sosyal Medyalarını Getirme
router.get('/getAllSocialById/:userId', async(req, res) => {
    const { userId } = req.params
    let keys = []
    await client.keys('UserWithSocial'+userId+'??').then(async(r) => {
      keys = r
      console.log('KEY LIST', keys)
  })
  if(keys.length > 0) {
    console.log('isExist', keys.length)
    logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
    await client.mGet(keys).then((async(reply) => {
        let str = "["+(reply)+"]"
        res.status(200).json(JSON.parse(str))
    })
    )} 
    else {
        console.log('notExist', keys)
        try {
            const user = await User.findByPk(userId)
            const data = await user.getSocials()
            //console.log('res', data)
            logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
            res.status(200).json(data) 
            // Redis MSET
            const records = {}
            data.forEach((element) => {
                records['UserWithSocial'+element.user_id+element.id] = JSON.stringify(element)
            })
            client.mSet(records, {EX: ttl5sn}).then(async(v) => {
                console.log('SET ETME İŞLEMİ', v)
            }) 
        } catch (error) {
            logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
            res.status(500).json({ message: 'Hata Gerçekleşti' })
            console.log('err', error)
        }
    }  
})

// Tüm Sosyal Medyaları Getirme
router.get('/getAllSocial', async(req, res) => {
    let keys = []
    await client.keys('UserWithSocial'+'????').then(async(r) => {
      keys = r
      console.log('KEY LIST', keys)
  })
  if(keys.length > 0) {
    console.log('isExist', keys.length)
    logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
    await client.mGet(keys).then((async(reply) => {
        let str = "["+(reply)+"]"
        res.status(200).json(JSON.parse(str))
    })
    )} 
    else {
        try{
            // attributes kullanarak filtreleme yapılabilir
            // kullanılmazsa tüm veriler gelir
            const response = await Socials.findAll({
                // attributes: ['test_id', 'testAd']
    
                // OUTPUT: 
                // item{"test_id":1,"testAd":"Ali"}
                // item{"test_id":2,"testAd":"Ayşe"}
            })
            logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
            res.status(200).json(response)
            // Redis MSET
            const records = {}
            response.forEach((element) => {
                records['UserWithSocial'+element.user_id+element.id] = JSON.stringify(element)
            })
            client.mSet(records, {EX: ttl5sn}).then(async(v) => {
                console.log('SET ETME İŞLEMİ', v)
            }) 
        } catch(error) {
            logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
            res.status(500).json({ message: 'Hata Gerçekleşti' })
            console.log('err', error)
        }
    }

})

// Sosyal Medyalardan İstenileni ID'ye Göre Silme 
router.delete('/deleteSocialById/:userId/:socialId', async(req, res) => {
    const { userId, socialId } = req.params
    try {
        const user = await User.findByPk(userId)
        const socialMedia = await Socials.findByPk(socialId)
        const r = await user.removeSocial(socialMedia)
        logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
        res.status(200).json({ result: "OK" })  
        // DEL Redis
        client.del('UserWithSocial'+userId+socialId).then((r) => {
         console.log('res', r)
        })
    } catch (error) {
        logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
        res.status(500).json({ message: 'Hata Gerçekleşti' })
        console.log('err', error)
    }
})

// User'ın Sosyal Medyasını Güncelleme
router.put('/updateData/:userId/:socialId', async(req, res) => {
    const { userId, socialId } = req.params
    const { socialMediaName } = req.body
    try{
        const user = await User.findByPk(userId)
        const data = await user.getSocials(socialId)
        // const jsonData = JSON.stringify(data)
        const nb = Number(socialId)
        // console.log('data', nb)
        const up = await Socials.update({ socialMediaName: socialMediaName },  { where: { id: nb } })
        const findedData = await Socials.findByPk(socialId)
        logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
        res.status(200).json(up)
          // Redis SET
          client.set('UserWithSocial'+userId+socialId, JSON.stringify(findedData), {EX: ttl5sn}).then(async(v) => {
             console.log('SET ETME İŞLEMİ', v)
         }) 
    } catch (error) {
        logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
        res.status(500).json({ message: 'Hata Gerçekleşti '})
        console.log('err', error)
    }   
})

// Express Validator
router.post('/register', validateUser.validateUser(), (req, res) => {
    const { username, password } = req.body
    const errors = validationResult(req)
    if (errors.isEmpty()) {
        logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
        res.status(200).json({ message: 'Başarılı', username: username, password: password })
        console.log(username, password)
    } else {
        logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
        res.status(400).json(errors.array({ onlyFirstError: false }))
    }
})

// Diğer Express-Validator Kullanımları
router.get('/getUsersById/:userId', validateUser.validateGetUserById(), (req, res) => {
    const errors = validationResult(req)
    console.log(errors.array())
})

router.get('/getUserByQuery', validateUser.validateQuery(), (req, res) => {
    const errors = validationResult(req)
    console.log(errors.array())
})

// Nodemailer ile mail gönderme
const nodemailer = require('nodemailer')

router.post('/sendmail', async(req,res) => {
    let user = req.body;
    try{
        sendMail(user, info => {
            res.status(200).json({ message: 'Başarılı İşlem', info: info })
            logger.logInfo(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı `)
          });
    } catch (error) {
        res.status(500).json({ message: 'Hatalı İşlem' })
        logger.logError(`${req.ip} den ilgili endpointe  ${req.path} erişim sağlandı hata alındı hata bilgileri ${error} `)
    }
})

async function sendMail(user, callback) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      //host: "smtp.gmail.com",
      //port: 587,
      //secure: false, // true for 465, false for other ports
      service: 'gmail',
      auth: {
        user: "MAIL_HERE", 
        pass: "PASSWORD_HERE" 
      }
    });
    
  
    let mailOptions = {
      from: '"NodeApp Developer"<anilyilmaz108@gmail.com>', // sender address
      to: user.email, // list of receivers
      subject: "Node Aapp", // Subject line
      html: `<h1>${user.name}</h1><br>
      <h4>Hatırlatma maili</h4>`
    };
  
    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions);
  
    callback(info);
  }

// Express + Redis ile Port Çalıştırma
connectRedis().then(() => {
    app.listen(PORT, async() => {
        await db.connect()
        // db.createTables()
        console.log('Done !')
        // Üretilen Token
        console.log(constants.token)
    })
})
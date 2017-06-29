import { User, UserDocument, Users } from '../../src/user'

let myUser = new User({ name: 'a', mail: 'aaa@aaa.com' })
Users.create(myUser, (err: any, doc: UserDocument) => {
   if (err) { ... }
   console.log(doc._id) // id at DB
   console.log(doc.name) // a
   doc.foo() // works :)
})
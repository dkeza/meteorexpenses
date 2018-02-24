Accounts.config({
  forbidClientAccountCreation : false
});
Accounts.onCreateUser(function(options, user) {
    options.profile.language = 'sr';
    user.profile = options.profile;
    return user;
});

Meteor.methods({
  insertKupac: function(cime, cprezime, cfirma) {
    var result = '';
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    result = Kupci.insert({
      firma: cfirma,
      ime: cime,
      prezime: cprezime,
      createdAt: new Date(),
      userid: Meteor.userId()
    });
    return result;
  },
  updateKupac: function(nid, cime, cprezime, cfirma) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    Kupci.update(nid, {
      $set: {firma: cfirma, ime: cime, prezime: cprezime}
    });
    return true;
  },
  deleteKupac: function(nid) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    Troskovi.remove({kupacid:nid});
    Prihodi.remove({kupacid:nid});
    Kupci.remove(nid);
    return true;
  },
  insertProdavac: function(cfirma, cime, cprezime) {
    var result = '';
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    result = Prodavci.insert({
      firma: cfirma,
      ime: cime,
      prezime: cprezime,
      createdAt: new Date(),
      userid: Meteor.userId()
    });
    return result;
  },
  updateProdavac: function(nid, cfirma, cime, cprezime) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    Prodavci.update(nid, {
      $set: {firma: cfirma, ime: cime, prezime: cprezime}
    });
    return true;
  },
  deleteProdavac: function(nid) {
    var otrosak=null;
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    otrosak = Troskovi.findOne({"prodavacid":nid});
    if (otrosak) {
      throw new Meteor.Error("not-allowed-has-childs");
    };
    Prodavci.remove(nid);
    return true;
  },
  insertTrosak: function(ckupacid, cprodavacid, copis,  niznos) {
    var okupac=null, oprodavac=null, result='', okurs=null, nkurs=0.00;
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    okurs = Appsettings.findOne({kod:1});
    nkurs = okurs.kurs;
    okupac = Kupci.findOne({"_id":ckupacid});
    oprodavac = Prodavci.findOne({"_id":cprodavacid});
    result = Troskovi.insert({
      kupacid: okupac._id,
      prodavacid: cprodavacid,
      prodavacfirma: oprodavac.firma,
      opis: copis,
      iznos: niznos,
      kurs: nkurs,
      vreme: new Date(),
      placeno: false,
      userid: Meteor.userId()
    });
    return result;
  },
  updateTrosak: function(nid, cprodavacid, copis, niznos, lplaceno) {
    var oprodavac=null;
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    if (typeof(lplaceno)==='boolean') {
      Troskovi.update(nid, {$set: {placeno: lplaceno} });
    } else {
      oprodavac = Prodavci.findOne({"_id":cprodavacid});
      Troskovi.update(nid, {
        $set: {opis: copis,prodavacid: cprodavacid, prodavacfirma: oprodavac.firma, iznos: niznos}
      });
    }
    return true;
  },
  deleteTrosak: function(nid) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    Troskovi.remove(nid);
    return true;
  },
  updateAppsettings: function(cfieldname, uvalue, lcronjob) {
    var oappsettings=null;
    if (!lcronjob) {
      if (! (Meteor.userId() && Roles.userIsInRole(Meteor.userId(), ['admin']))) {
        throw new Meteor.Error("not-authorized");
      };
    };
    oappsettings = Appsettings.findOne({});
    if (cfieldname==="kurs") {
      Appsettings.update(oappsettings._id, { $set: {kurs: uvalue, vreme: new Date()} });
    };
    return true;
  },
  insertPrihod: function(ckupacid, copis,  niznos, niznoseur) {
    var okupac=null, oprodavac=null, result='', okurs, nkurs, nconverted=0.00;
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    okurs = Appsettings.findOne({kod:1});
    nkurs = okurs.kurs;
    if (niznoseur) {
      nconverted = niznoseur*nkurs;
      niznos = accounting.unformat(accounting.toFixed(nconverted,2));
    };
    okupac = Kupci.findOne({"_id":ckupacid});
    result = Prihodi.insert({
      kupacid: okupac._id,
      opis: copis,
      iznos: niznos,
      kurs: nkurs,
      vreme: new Date(),
      userid: Meteor.userId()
    });
    return result;
  },
  deletePrihod: function(nid) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    };
    Prihodi.remove(nid);
    return true;
  }
});

SyncedCron.config({
  collectionName: 'Appsettings',
  utc: true,
});

SyncedCron.add({
  name: 'Get EUR exchenge rate',
  schedule: function(parser) {
    // parser is a later.parse object
    //return parser.text('every 5 seconds');

    return parser.text('at 11:00 pm');
    // midnight is at 5pm LA time ... 10 am LA time is 3 am UTC
  },
  job: function(intendedAt) {
    //var today = new Date();
    //var yesterday = new Date()
    //var dayBeforeYesterday = new Date()
    //yesterday.setDate(today.getDate() - 1)
    //dayBeforeYesterday.setDate(today.getDate() - 2)


    //var todaysUsers = Meteor.users.find({   createdAt: {    $lt: (yesterday), $gt: dayBeforeYesterday   } }).fetch()
    //rest of function here
      var rates = new OpenExchangeRates(process.env.OERKEY);
      rates.latest(function(err, result){
        var neuro = 0.00;
        neuro = result.rates.RSD/result.rates.EUR;
        neuro = accounting.toFixed(neuro,2);
        Meteor.call("updateAppsettings", "kurs", neuro, true);
      });
  }
});

Meteor.startup(function () {
  // code to run on server at startup
  if ( Appsettings.find().count() === 0 ) {
    console.log("Must insert new record");
    Appsettings.insert({
          kod: 1,
          kurs: 121.37
    });
  }

  var ausers = [], ausersfind = [], usid='', x='' ;
  
  // Add users here
  
  ausersfind = _.where(Meteor.users.find().fetch(), {username: "admin"});
  if (ausersfind.length === 0) {
      usid = Accounts.createUser({
          username: 'admin',
          password: '123456',
          emails: [
          {
            "address": "admin@somemail.local",
            "verified": true
          }
          ],
          profile: {
              first_name: 'Mike',
              last_name: 'Doe',
              company: 'Software Company',
              language: 'sr'
          }
      });
      console.log(usid);
      // Need _id of existing user record so this call must come
      // after `Accounts.createUser` or `Accounts.onCreate`
      x = Roles.addUsersToRoles(usid, ['admin']);
      console.log(x);
  };
  
  ausersfind = _.where(Meteor.users.find().fetch(), {username: "pera"});
  if (ausersfind.length === 0) {
      Accounts.createUser({
          username: 'pera',
          password: '123456',
          emails: [
          {
            "address": "pera@zdera.mymailq.com",
            "verified": true
          }
          ],
          profile: {
              first_name: 'Pera',
              last_name: 'Peric',
              company: 'Comp',
              language: 'sr'
          }
      });
  };
  
  // Add users END

/*     ausers = Meteor.users.find().fetch();
  _.each(ausers, function(ouser) {
    console.log(ouser.username);
  }) */
  
  SyncedCron.start();

});
Meteor.publish("kupci", function () {
  if (this.userId) {
    return Kupci.find({userid: this.userId});
  }
});
Meteor.publish("prodavci", function () {
  if (this.userId) {
    return Prodavci.find({userid: this.userId});
  }
});
Meteor.publish("troskovi", function () {
  if (this.userId) {
    return Troskovi.find({userid: this.userId});
  }
});
Meteor.publish("prihodi", function () {
  if (this.userId) {
    return Prihodi.find({userid: this.userId});
  }
});
Meteor.publish("appsettings", function () {
  if (this.userId) {
    return Appsettings.find();
  }
});
Meteor.users.deny({
  update: function(userId, doc, fields, modifier) {
    var ldeny=true;
    if (userId && doc._id === userId && _.contains(fields, "profile")) {
      ldeny=false;
    };
    return ldeny;
  } 
});

const express = require("express");
const app = new express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt=require("jsonwebtoken");
app.use(express.json());
let db = null;
const bcrypt=require("bcrypt");
let dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const authenticationMiddleware =(request,response,next)=>{
    const AuthHeader=request.headers['authorization'];
    let jwtToken;
    if(AuthHeader!==undefined)
    {
        jwtToken=AuthHeader.split(' ')[1];
    }
    if(jwtToken===undefined)
    {
        response.status(401);
        response.send("Invalid JWT Token");
    }
    else
    {
        jwt.verify(jwtToken,"secret_token",async(error,payload)=>{
            if(error)
            {
                response.status(401);
                response.send("Invalid JWT Token");
            }
            else
            {
                next();
            }
        });
    }
};
app.get("/states/",authenticationMiddleware,async (request, response) => {
  const query = `
    select state_id as stateId,state_name as stateName,population as population
    from state
    ;`;
  const result = await db.all(query);
  response.send(result);
});

app.get("/states/:stateId/", authenticationMiddleware,async (request, response) => {
  const { stateId } = request.params;
  const query = `
    select state_id as stateId,state_name as stateName,population as population
    from state
    where state_id =${stateId}
    ;`;
  const result = await db.get(query);
  response.send(result);
});

app.post("/districts/",authenticationMiddleware,async (request, response) => {
  try {
    const inp = request.body;
    const { districtName, stateId, cases, cured, active, deaths } = inp;
    const query = `
        Insert into District(district_name,state_id,cases,cured,active,deaths)
        values('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
    await db.run(query);
    response.send("District Successfully Added");
  } catch (error) {
    response.send(error);
  }
});

app.get("/districts/:districtId",authenticationMiddleware,async (request, response) => {
  const { districtId } = request.params;
  const query = `
    select district_id as  districtId,district_name as districtName,
    state_id as stateId,
    cases,
    cured,
    active,
    deaths
    from district
    where district_id=${districtId};`;
  const result = await db.get(query);
  response.send(result);
});

app.delete("/districts/:districtId",authenticationMiddleware, async (request, response) => {
  try {
    const { districtId } = request.params;
    const query = `
        delete from district 
        where district_id=${districtId};`;
    await db.run(query);
    response.send("District Removed");
  } catch (error) {
    console.log("error");
  }
});

app.put("/districts/:districtId", authenticationMiddleware,async (req, res) => {
  try {
    const dt = req.body;
    const { districtName, stateId, cases, cured, active, deaths } = dt;
    const quer = `
        update district
        set 
        district_name='${districtName}',
        state_id=${stateId},
        cases=${cases},
        cured=${cured},
        active=${active},
        deaths=${deaths}
        `;
    await db.run(quer);
    res.send("District Details Updated");
  } catch (err) {
    console.log(err);
  }
});

app.get("/states/:stateId/stats/",authenticationMiddleware, async (req, res) => {
  try {
    const { stateId } = req.params;
    const qu = `
        select sum(cases) as totalCases,sum(cured) as totalCured,
        sum(active) as totalActive,
        sum(deaths) as totalDeaths
        from district 
        where state_id=${stateId};`;
    // const qu=`
    // select sum(cases) as totalCases,sum(cured) as totalCured,
    // sum(active) as totalActive,
    // sum(deaths) as totalDeaths
    // from district
    // where state_id=${stateId};`;
    const result = await db.get(qu);
    res.send(result);
  } catch (error) {
    console.log(error);
  }
});
app.get("/districts/:districtId/details/",async(req,res)=>{
    try 
    {
        const {districtId}=req.params;
        const query=`
        select state_name as stateName
        from state
        where state_id in (select state_id from district where district_id=${districtId});`;
        const result=await db.get(query);
        res.send(result);
    } 
    catch (error) 
    {
        console.log(error);
    }
});
app.post('/login/',async(request,response)=>{
    const {username,password}=request.body;
    const checkQuery=`
    select *
    from user 
    where username='${username}';`;
    const result=await db.get(checkQuery);
    if(result===undefined)
    {
        response.status(400);
        response.send("Invalid user");
    }
    else
    {
        const comprPassword=await bcrypt.compare(password,result.password);
        if(comprPassword===true)
        {
            const payload={username:username};
            const jwtToken=await jwt.sign(payload,"secret_token");
            response.send({jwtToken});
        }
        else
        {
            response.status(400);
            response.send("Invalid password");
        }
    }
});
const initializeDBandserver = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    console.log("DB Connected Successfully");
    app.listen(3000, () => {
      console.log("Servor running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(error);
  }
};
initializeDBandserver();

module.exports = app;
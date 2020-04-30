var apiGetUsers = "https://turotrackerfetcher.azurewebsites.net/api/users?code=W0cY9erJuRhGLxSra7jDufItw6SRNnkPaHCw7pzmnLrRO9xa2Uln2w==";
var apiGetClubs = "https://turotrackerfetcher.azurewebsites.net/api/clubs?code=15OpgjQl5HA4uYALGRZxvc7peWwBIjdHe32wJtD3ASRkgAiFRzKqfA==";

var selectedUserIDs = [];
var selectedClub = 0;

var users = {};
var clubs = {};

var data = {};
var mode = 1;
var loaded = false;

var graph = null;

var urlParams = null;

var default_colors = ['#3366CC','#DC3912','#FF9900','#109618','#990099','#3B3EAC','#0099C6','#DD4477','#66AA00','#B82E2E','#316395','#994499','#22AA99','#AAAA11','#6633CC','#E67300','#8B0707','#329262','#5574A6','#3B3EAC']

function urlParamsUpdated()
{
    if (urlParams == null)
    {
        return;
    }

    var loc = window.location;
    var url = `${loc.origin}${loc.pathname}?${urlParams.toString()}`
    console.log(url)
    history.replaceState(null, '', url);
}

function parseUrl()
{
    if (!loaded)
    {
        console.log("data not loaded")
        loaded = true;
        return;
    }

    console.log("parsing url")

    var queryString = window.location.search;
    urlParams = new URLSearchParams(queryString);

    if (urlParams.has('mode'))
    {
        mode = urlParams.get('mode');
        console.log("Found mode " + mode)
    }

    if (urlParams.has('club'))
    {
        selectClub(urlParams.get('club'))
        console.log("Found club " + selectedClub)
    }
    
    if (urlParams.has('users'))
    {
        var userIDs = urlParams.get('users').split(',');
        console.log("Found users " + userIDs);
        userIDs.forEach( (userID, index) => selectUser(userID));
    }
}

$(document).ready( function() {
    $.get(apiGetUsers, function ( data ) {
    data.forEach( (user, index) => users[user.userID] = user);
    $.each(data, function(i, p) {
        $('#selectUser').append($('<option></option>').val(p.userID).html(p.name));
    });

    parseUrl();
    });
    
    $.get(apiGetClubs, function ( data ) {
    data.forEach( (club, index) => clubs[club.clubID] = club);
    clubs[0] = {clubID: 0, name: "Total"}
    $.each(data, function(i, p) {
        $('#selectClub').append($('<option></option>').val(p.clubID).html(p.name));
    });

    parseUrl();
    });
});

function clubSelected(selector) {
    var clubID = parseInt(selector.options[selector.selectedIndex].value);
    if  (clubID  == -1)
    {
        selector.selectedIndex = 0;
        return;
    }

    selectClub(clubID);
    urlParams.set("club", clubID);
    urlParamsUpdated();
}

function selectClub(clubID) {
    if  (clubID == selectedClub)
    {
        return;
    }

    $('#selectClub')[0].value = clubID;
    selectedClub = clubID;
    userData = {}
    selectedUserIDs.forEach( (userID, index) => getDataForUser(userID));
}


function userSelected(selector) {
    var userID = parseInt(selector.options[selector.selectedIndex].value);
    if  (userID  == -1)
    {
        selector.selectedIndex = 0;
        return;
    }
    
    selectUser(userID);
}

function selectUser(userID)
{
    $('#selectUser')[0].selectedIndex = 0;
    var index = selectedUserIDs.indexOf(userID);
    if (index != -1)
    {
        return;
    }

    selectedUserIDs.push(userID);

    getDataForUser(userID);
    urlParams.set("users", selectedUserIDs.join(','));
    urlParamsUpdated();
}

function modeSelected(selector) {
    var newMode = parseInt(selector.options[selector.selectedIndex].value);
    if  (newMode == mode)
    {
        return;
    }
    
    mode = newMode;
    dataUpdated();
    urlParams.set("mode", mode);
    urlParamsUpdated();
}

function getDataForUser(userID)
{
    if  (selectedClub == null)
    {
        return;
    }

    console.log(`Getting data for user [${userID}] in club [${selectedClub}]`)
    var url = `https://turotrackerfetcher.azurewebsites.net/api/scores/${selectedClub}/${userID}?code=D2DC7NmU0RuGdoKvH6VFfDAaPDkM5Zy9SxXyNZkOoP8uQfoJ8/6wKA==`

    $.get(url, function ( userData ) {
        data[userID] = userData;
        dataUpdated();
    });
}

function userRemoved(userID)
{
    var index = selectedUserIDs.indexOf(userID);
    if (index == -1)
    {
        return
    }

    selectedUserIDs.splice(index, 1);
    delete data[userID];
    dataUpdated();
}

function legendHandler(e, legendItem)
{
    console.log(legendItem);
    var userName = legendItem.text;
    for (key in selectedUserIDs)
    {
        var userID = selectedUserIDs[key]
        if (users[userID].name == userName)
        {
            userRemoved(userID);
            return
        }
    }
}

function dataUpdated()
{
    if  (selectedClub == null)
    {
        return;
    }
    
    var datasets = [];
    for (var key in data)
    {
        var userData = data[key];
        var userValues;
        if (mode == 4) { userValues = userData.map(ud => {return {x: ud.date, y: ud.rankPunches}} ) }
        else if (mode == 3) { userValues = userData.map(ud => {return {x: ud.date, y: ud.rankPoints}}) }
        else if (mode == 2) { userValues = userData.map(ud => {return {x: ud.date, y: ud.punches}}) }
        else { userValues = userData.map(ud => {return {x: moment(ud.date), y: ud.points}}) }

        var dataset = {
                label: users[key].name,
                data : userValues
        };

        console.log(dataset);
        datasets.push(dataset);
    }

    var ctx = document.getElementById('graph').getContext('2d');
    if (graph != null)
    {
        graph.destroy();
    }

    graph = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            elements: {
                line: {
                    tension: 0
                }
            },
            responsive: true,
            scales: {
                xAxes: [{
                    type: 'time'
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            },
            plugins: {
                colorschemes: {
                    scheme: 'brewer.SetTwo8'
                }
            },
            legend: {
                onClick: legendHandler
            }
        }
    });
}
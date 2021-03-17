// Developed by Grant @ GeekOverdriveStudio
var currencyRegex = /[^\d,](.)([0-9]+\.[0-9]+)+/
var worthRegex = /([^\s\d][0-9]+\.[0-9]+)+/
var investedCurrencyRegex = /(−|\+)(.)[0-9]+\.[0-9]+/
var investedRegex = /((−|\+)[^\d\s][0-9]+\.[0-9]+)+/
var cryptoRegex = /((−|\+)[0-9]+\.[0-9]+)+ /
var cryptoBalanceRegex = /([0-9]+\.*[0-9]*( [A-Z]+))+/
var currency = ""
var currentURL = "";
var checker;

function createStats() {
    if (document.getElementById("coinbaseNet")) { return; }
    var aTags = document.getElementsByTagName("span");
    btnStyle = "position: absolute; top: 50%; right: 5%; transform: translate(0, -50%); background-color: white; border: solid 1px #0040FF; border-radius: 5px; color: #0040FF; font-weight: 500;"
    var balanceSpan;
    var worthText = "Balance:";
    var investedTotal = 0;
    var cryptoTotal = 0;
    var cryptoBalance = 0;
    var worth;
    var found;

    // Run data getter for loop in setInterval until found is true
    // This allows us to wait however long it takes to load the page fully until scraping it for the data needed
    checker = setInterval(function() {
        // Due to the seemingly randomized nature of Coinbase page class names, I had to resort to iterating through each <span> element to find the data
        // However, this doesn't appear to make a considerable impact on web page performance.
        for (var i = aTags.length-1; i >= 0; i--) {
            // If this is the 'Balance' span, read the balance value from it
            if (aTags[i].innerHTML.includes(worthText) && !found) {
                // Parse the worth of our investments from the 'Balance' span
                // Parse the crypto balance of our investments from the 'Balance' span
                found = true;
                balanceSpan = aTags[i-1];
                currency = aTags[i+1].innerHTML.toString().match(currencyRegex)[1];
                worth = aTags[i+1].innerHTML.toString();
                worth = worth.replace(',', '');
                worth = worth.match(worthRegex)[0];
                worth = parseFloat(worth.replace(currency, ''));

                cryptoBalance = aTags[i+1].innerHTML.toString();
                cryptoBalance = cryptoBalance.replace(',', '');
                cryptoBalance = parseFloat(cryptoBalance.match(cryptoBalanceRegex)[0]);
                console.log(`Balance: ${currency}${cryptoBalance} (${currency}${worth})`);
            // If this is a Purchase or Sell span, read the crypto and investment values from it
            } else if (aTags[i].innerHTML.match(investedRegex)) {
                // Parse the amount we invested from this span, replacing the unicode minus-sign with a dash
                // Add it to the investedTotal
                investedCurrency = aTags[i].innerHTML.toString().match(investedCurrencyRegex)[2];
                increment = parseFloat(aTags[i].innerHTML.toString().match(investedRegex)[0].replace(investedCurrency, '').replace('−', '-'));
                console.log(increment);
                if (increment > 0) { investedTotal = investedTotal + increment; }
            } else if (aTags[i].innerHTML.match(cryptoRegex)) {
                // Parse the amount of crypto we received/sold from this span, replacing the unicode minus-sign with a dash
                // If this increment is a sale, we need to figure out how much of our crypto we sold since our investment could be with more or less since we bought it
                // We then multiply that by the amount we have invested up until this point, removed from invested total, to get our new invested total
                // Then clamp crypo total between infinity and 0 since we can't have a negative crypto balance (this can be incurred by floating point inaccuracy)
                increment = parseFloat(aTags[i].innerHTML.toString().match(cryptoRegex)[0].replace('−', '-'));
                if (increment < 0) {
                    investedTotal = investedTotal - (investedTotal * Math.min(Math.abs(increment) / cryptoTotal, 100));
                }
                cryptoTotal = Math.max(cryptoTotal + increment, 0);
            }

        }

        if (found && balanceSpan) {
            // Calculate our breakeven point and our net difference in value of our investments
            if (cryptoBalance > 0) {
                var breakEvenPoint = investedTotal / cryptoBalance
                var netPercent = Math.abs(((worth / cryptoBalance) / breakEvenPoint) - 1) * 100
            } else {
                var breakEvenPoint = 0
                var netPercent = 0
            }
            if (investedTotal < 0) { investedTotal = 0 }

            // Insert our preset divs with the calculations alongside the 'Balance' span
            insertAfter(balanceSpan, createElements(
                parseFloat((investedTotal).toFixed(2)),
                parseFloat((worth - investedTotal).toFixed(2)),
                parseFloat((breakEvenPoint).toFixed(2)),
                parseFloat((netPercent).toFixed(2))
            ));
            // If we haven't already inserted it, place a refresh button in the header, where the 'Balance' span is located
            // This allows the user to refresh the stats in case there is a calculation error
            if (!document.getElementById("statsRefresh")) {
                let refresh = document.createElement("button");
                refresh.innerHTML = "Refresh"; refresh.id = "statsRefresh";
                refresh.style = btnStyle
                refresh.onmouseover = function() { refresh.style = btnStyle + "cursor: pointer;" }
                refresh.onclick = refreshElements;
                balanceSpan.parentElement.parentElement.parentElement.style = "position: relative;"

                insertAfter(balanceSpan.parentElement.parentElement, refresh)
            }
            clearInterval(checker);
        }

    }, 100)
}

// Raw JS InsertAfter code from StackOverflow. StackOverflow FTW!
function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

// Create our preset elements
function createElements(invested, profit, brp, netPercent) {
    let container = document.createElement("span");
    let totalInvested = document.createElement("span");
    let profitLabel = document.createElement("span");
    let profitEle = document.createElement("span");
    container.appendChild(totalInvested);
    container.appendChild(profitLabel);
    container.appendChild(profitEle);

    container.id = "coinbaseNet";
    totalInvested.innerHTML = `<br>Invested: ${currency}${invested} × (${currency}${brp})<br>`;
    profitLabel.innerHTML = `Net: `;
    profitEle.innerHTML = ((profit >= 0) ? "+" : "−") + `${currency}${Math.abs(profit)}` + ((profit >= 0) ? " (▲" : " (▼") + `${netPercent}%)`;
    profitEle.style = "color: " + ((profit >= 0) ? "green;" : "red;");
    return container;
}

// If the user presses 'Refresh', this function is run. I hope this is self-explanatory
function refreshElements() {
    document.getElementById("coinbaseNet").remove()
    createStats()
}

// If the user browses to a different location on Coinbase, run CreateStats() again
// I tried so many 'proper' ways to do this, including window.onlocationchange. Sometimes you have to screw the proper ways of doing things if they simply don't work or over-complicate things
setInterval(function(){
    if (currentURL != window.location.href) {
        currentURL = window.location.href;
        if (checker) { clearInterval(checker); }
        createStats();
    }
}, 100);
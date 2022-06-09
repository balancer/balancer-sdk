use ethcontract::errors::MethodError;

pub fn handle_bal_error(e: &MethodError) {
    if e.inner.to_string().contains("BAL#") {
        println!("
      Your call to the ethereum node was successful. However, your inputs reverted with a BAL error. 

      See Balancer Error Codes here: https://dev.balancer.fi/references/error-codes
    ");
    }
}

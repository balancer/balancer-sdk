mod examples;

#[tokio::main]
async fn main() {
    println!("Starting examples..");

    examples::weth().await;
}
